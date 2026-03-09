-- =============================================================================
-- SAFE DELETE ALL BOT DATA
-- =============================================================================
-- Usage: Run in Supabase SQL Editor. First check row counts with "PREVIEW" section.
-- On-chain data (passport, rank-up NFT) is NOT affected; only Supabase tables are deleted.
-- =============================================================================

-- PREVIEW (run before delete to see how many rows will be deleted)
/*
SELECT 'combat_logs' AS table_name, COUNT(*) AS rows FROM public.combat_logs
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
-- DELETE (transaction: rolled back if any fails)
-- =============================================================================
BEGIN;

-- 1. Match logs (references matches)
DELETE FROM public.combat_logs;

-- 2. Rank-up loot requests (bot_id, match_id)
DELETE FROM public.rank_up_loot_requests;

-- 3. User–bot binding requests
DELETE FROM public.agent_bind_requests;

-- 4. Matches (player_1_id, player_2_id, winner_id → bots)
DELETE FROM public.matches;

-- 5. Bots
DELETE FROM public.bots;

COMMIT;

-- Note: Redis matchmaking pool (matchmaking:pool) must be cleared by backend/app
-- or backend must be restarted. Redis cannot be cleared via SQL.
