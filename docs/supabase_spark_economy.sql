-- =============================================================================
-- Lanista Spark Economy – Supabase migration
-- =============================================================================
-- spark_balances: Kullanici basina Spark bakiyesi (auth.users ile iliskili).
-- spark_transactions: Tum Spark hareketleri (satin alma, watch_reward, spend, vb.).
-- RLS: Kullanici sadece kendi bakiyesini ve kendi islemlerini okuyabilir.
-- Backend (service_role) tum insert/update islemlerini yapar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. spark_balances
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spark_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_balances_user_id ON public.spark_balances(user_id);
COMMENT ON TABLE public.spark_balances IS 'Izleyici Spark bakiyeleri. user_id = auth.users.id; wallet_address = son odeme yapilan EVM adresi.';

-- -----------------------------------------------------------------------------
-- 2. spark_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spark_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  reference_id text,
  wallet_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_transactions_user_id ON public.spark_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_spark_transactions_created_at ON public.spark_transactions(created_at DESC);
COMMENT ON TABLE public.spark_transactions IS 'Spark hareketleri: purchase, watch_reward, spend_tomato, prediction_win, vb. reference_id = tx_hash veya match_id.';

-- -----------------------------------------------------------------------------
-- 2b. (Tek seferlik) Aynı tx_hash ile iki kez kredi verilmişse: bakiyeyi düzelt,
--     fazla kayıtları sil, sonra idempotent unique index'i oluştur.
--     Bu 3 ifadeyi sırayla çalıştırın (duplicate yoksa da güvenlidir).
-- -----------------------------------------------------------------------------
WITH dup AS (
  SELECT user_id, reference_id, amount, count(*) AS cnt
  FROM public.spark_transactions
  WHERE transaction_type = 'purchase' AND reference_id IS NOT NULL
  GROUP BY user_id, reference_id, amount
  HAVING count(*) > 1
),
excess AS (
  SELECT user_id, (cnt - 1) * amount AS to_subtract
  FROM dup
)
UPDATE public.spark_balances b
SET balance = greatest(0, b.balance - e.to_subtract)
FROM excess e
WHERE b.user_id = e.user_id;

DELETE FROM public.spark_transactions t
WHERE t.transaction_type = 'purchase'
  AND t.reference_id IS NOT NULL
  AND t.id NOT IN (
    SELECT DISTINCT ON (user_id, reference_id) id
    FROM public.spark_transactions
    WHERE transaction_type = 'purchase' AND reference_id IS NOT NULL
    ORDER BY user_id, reference_id, created_at ASC
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_spark_transactions_purchase_idempotent
  ON public.spark_transactions(user_id, reference_id)
  WHERE transaction_type = 'purchase' AND reference_id IS NOT NULL;
COMMENT ON COLUMN public.spark_transactions.wallet_address IS 'Satın alımda ödeme yapan EVM adresi; farklı cüzdanlardan ödeme takibi ve debug için.';

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.spark_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spark_transactions ENABLE ROW LEVEL SECURITY;

-- spark_balances: kullanici sadece kendi satirini gorebilir
CREATE POLICY "Users can read own spark_balances"
  ON public.spark_balances FOR SELECT
  USING (auth.uid() = user_id);

-- spark_balances: insert/update sadece service_role (backend) yapacak; frontend sadece okur
-- (Backend service role RLS disinda calisir, bu yuzden ek policy gerekmez.)

-- spark_transactions: kullanici sadece kendi islemlerini gorebilir
CREATE POLICY "Users can read own spark_transactions"
  ON public.spark_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. (Opsiyonel) updated_at tetikleyici – spark_balances
-- PostgreSQL 11+ EXECUTE FUNCTION; eski surumlerde EXECUTE PROCEDURE kullanin.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_spark_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spark_balances_updated_at ON public.spark_balances;
CREATE TRIGGER spark_balances_updated_at
  BEFORE UPDATE ON public.spark_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_spark_balances_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Realtime (Frontend canli bakiye icin)
-- Supabase Dashboard > Database > Realtime > spark_balances tablosunu ekleyin
-- veya: ALTER PUBLICATION supabase_realtime ADD TABLE public.spark_balances;
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 6. (Mevcut DB için) spark_transactions'a wallet_address ekle
-- -----------------------------------------------------------------------------
ALTER TABLE public.spark_transactions ADD COLUMN IF NOT EXISTS wallet_address text;
COMMENT ON COLUMN public.spark_transactions.wallet_address IS 'Satın alımda ödeme yapan EVM adresi; farklı cüzdanlardan ödeme takibi ve debug için.';

-- -----------------------------------------------------------------------------
-- 7. Atomik bakiye güncelleme (race condition önleme)
-- Backend read-then-write yerine bu RPC'leri kullanmalı.
-- Purchase için idempotency: aynı reference_id (tx_hash) ile ikinci çağrıda bakiye
-- artırılmaz (backend restart sonrası aynı event'in tekrar işlenmesini önler).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spark_credit(
  p_user_id uuid,
  p_amount int,
  p_wallet_address text DEFAULT NULL,
  p_tx_type text DEFAULT 'purchase',
  p_reference_id text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal int;
  already_done boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Idempotency: aynı purchase (tx_hash) daha önce işlendiyse sadece mevcut bakiyeyi döndür
  IF p_tx_type = 'purchase' AND p_reference_id IS NOT NULL AND trim(p_reference_id) <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.spark_transactions
      WHERE user_id = p_user_id AND transaction_type = 'purchase' AND reference_id = p_reference_id
    ) INTO already_done;
    IF already_done THEN
      SELECT COALESCE(balance, 0) INTO new_bal FROM public.spark_balances WHERE user_id = p_user_id;
      RETURN COALESCE(new_bal, 0);
    END IF;
  END IF;

  INSERT INTO public.spark_balances (user_id, balance, wallet_address, updated_at)
  VALUES (p_user_id, p_amount, p_wallet_address, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.spark_balances.balance + p_amount,
    wallet_address = COALESCE(EXCLUDED.wallet_address, public.spark_balances.wallet_address),
    updated_at = now()
  RETURNING balance INTO new_bal;

  INSERT INTO public.spark_transactions (user_id, amount, transaction_type, reference_id, wallet_address)
  VALUES (p_user_id, p_amount, p_tx_type, p_reference_id, p_wallet_address);

  RETURN new_bal;
END;
$$;

CREATE OR REPLACE FUNCTION public.spark_spend(
  p_user_id uuid,
  p_amount int,
  p_tx_type text DEFAULT 'spend',
  p_reference_id text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.spark_balances
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.spark_transactions (user_id, amount, transaction_type, reference_id)
  VALUES (p_user_id, -p_amount, p_tx_type, p_reference_id);

  RETURN new_bal;
END;
$$;

COMMENT ON FUNCTION public.spark_credit(uuid,int,text,text,text) IS 'Atomik Spark ekleme (satın alma, watch_reward). Race condition önler.';
COMMENT ON FUNCTION public.spark_spend(uuid,int,text,text) IS 'Atomik Spark harcama. Yetersiz bakiye ise exception fırlatır.';

-- -----------------------------------------------------------------------------
-- 8. Match predictions (arena betting)
-- predicted_bot_id = bot the user predicts will win (player_1_id or player_2_id).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  predicted_bot_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_predictions_match_id ON public.match_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_match_predictions_user_id ON public.match_predictions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_predictions_user_match ON public.match_predictions(user_id, match_id);

ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own match_predictions"
  ON public.match_predictions FOR SELECT
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 9. spark_bet: atomic bet (deduct balance + insert prediction). One bet per user per match.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spark_bet(
  p_user_id uuid,
  p_match_id uuid,
  p_predicted_bot_id uuid,
  p_amount int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pred_id uuid;
  new_bal int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.spark_balances
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.spark_transactions (user_id, amount, transaction_type, reference_id)
  VALUES (p_user_id, -p_amount, 'prediction_bet', p_match_id::text);

  INSERT INTO public.match_predictions (match_id, user_id, predicted_bot_id, amount, status)
  VALUES (p_match_id, p_user_id, p_predicted_bot_id, p_amount, 'pending')
  RETURNING id INTO pred_id;

  RETURN pred_id;
END;
$$;

COMMENT ON FUNCTION public.spark_bet(uuid,uuid,uuid,int) IS 'Atomic bet: deduct Sparks and create prediction. One bet per user per match (enforced by unique index).';
