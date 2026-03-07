-- =============================================================================
-- Lanista Arena – Match predictions (betting)
-- =============================================================================
-- Run this after supabase_spark_economy.sql (spark_balances, spark_transactions,
-- spark_credit, spark_spend must exist).
--
-- match_predictions: one row per user per match; predicted_bot_id = bot they
--   expect to win. Resolved by backend when match finishes (won/lost, payout).
-- spark_bet: atomic RPC to place a bet (deduct Sparks + insert prediction).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. match_predictions table
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

COMMENT ON TABLE public.match_predictions IS 'Arena prediction bets. One bet per user per match. Resolved on match finish.';

ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own match_predictions"
  ON public.match_predictions FOR SELECT
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. spark_bet RPC (atomic: deduct balance + insert prediction)
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
