-- ============================================================
-- Lanista — Betting Temizleme Migrasyonu
-- Mevcut sistemi bozmadan betting ile ilgili her şeyi kaldırır.
-- ============================================================
-- ÇALIŞTIRMA SIRASI:
--   1. Bu dosyayı Supabase SQL Editor'da çalıştır (tamamı bir kez)
--   2. Her adım IF EXISTS kullandığı için idempotent — defalarca
--      çalıştırılsa bile hata vermez.
-- ============================================================
-- ETKİLENMEYEN TABLOLAR / FONKSİYONLAR:
--   • spark_balances         → dokunulmaz
--   • spark_transactions     → dokunulmaz (geçmiş prediction kayıtları saklanır)
--   • spark_credit           → dokunulmaz
--   • spark_spend            → dokunulmaz
--   • matches                → dokunulmaz
--   • bots, profiles, ...    → dokunulmaz
-- ============================================================


-- ─── ADIM 1: spark_bet fonksiyonunu kaldır ──────────────────
-- Bu fonksiyon artık hiçbir backend route tarafından çağrılmıyor.
DROP FUNCTION IF EXISTS public.spark_bet(uuid, uuid, uuid, int);


-- ─── ADIM 2: match_predictions tablosunu kaldır ─────────────
-- CASCADE → bağlı index'leri, policy'leri ve trigger'ları
-- otomatik siler. matches tablosuna etkisi yok.
DROP TABLE IF EXISTS public.match_predictions CASCADE;


-- ─── ADIM 3: Kontrol sorgusu ────────────────────────────────
-- Aşağıdaki sorgular 0 satır döndürmeli:

-- match_predictions tablosu kalmadı mı?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'match_predictions';
-- Beklenen: 0 satır

-- spark_bet fonksiyonu kalmadı mı?
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'spark_bet';
-- Beklenen: 0 satır

-- spark_transactions'daki prediction kayıtları (geçmiş, silinmiyor):
SELECT transaction_type, COUNT(*) AS count
FROM public.spark_transactions
WHERE transaction_type IN ('prediction_bet', 'prediction_win', 'prediction_lose')
GROUP BY transaction_type;
-- Beklenen: testlerden kalan birkaç kayıt olabilir — bunlar geçmişte
-- harcanmış/kazanılmış Spark kayıtları olduğu için saklanıyor.
-- İstersen aşağıdaki DELETE ile temizleyebilirsin (opsiyonel):

-- [OPSİYONEL] Geçmiş prediction transaction'larını sil:
-- DELETE FROM public.spark_transactions
-- WHERE transaction_type IN ('prediction_bet', 'prediction_win', 'prediction_lose');
