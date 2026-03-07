-- =============================================================================
-- TÜM BOT VERİLERİNİ GÜVENLİ SİLME
-- =============================================================================
-- Kullanım: Supabase SQL Editor'da çalıştır. Önce "ÖN İZLEME" ile satır sayılarını kontrol et.
-- Zincir üzerindeki (passport, rank-up NFT) veriler ETKİLENMEZ; sadece Supabase tabloları silinir.
-- =============================================================================

-- ÖN İZLEME (silmeden önce kaç satır silinecek görmek için çalıştır)
/*
SELECT 'combat_logs' AS tablo, COUNT(*) AS satir FROM public.combat_logs
UNION ALL
SELECT 'rank_up_loot_requests', COUNT(*) FROM public.rank_up_loot_requests
UNION ALL
SELECT 'agent_bind_requests', COUNT(*) FROM public.agent_bind_requests
UNION ALL
SELECT 'matches', COUNT(*) FROM public.matches
UNION ALL
SELECT 'bots', COUNT(*) FROM public.bots;
*/

-- =============================================================================
-- SİLME (transaction: hepsi başarılı olmazsa geri alınır)
-- =============================================================================
BEGIN;

-- 1. Maç logları (matches'e referans)
DELETE FROM public.combat_logs;

-- 2. Rank-up loot istekleri (bot_id, match_id)
DELETE FROM public.rank_up_loot_requests;

-- 3. Kullanıcı–bot bağlantı istekleri
DELETE FROM public.agent_bind_requests;

-- 4. Maçlar (player_1_id, player_2_id, winner_id → bots)
DELETE FROM public.matches;

-- 5. Botlar
DELETE FROM public.bots;

COMMIT;

-- Not: Redis'teki matchmaking pool (matchmaking:pool) backend/uygulama tarafında temizlenmeli
-- veya backend yeniden başlatılmalı. SQL ile Redis silinmez.
