-- ERC-8004 reputation: store in DB for display/leaderboard; synced to chain by backend.
-- Run in Supabase SQL Editor.

ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS reputation_score int4 NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS wins int4 NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bots.reputation_score IS 'ERC-8004 style reputation; R = (W*10) - (L*5) + (M*1). Synced to LanistaAgentPassport on chain.';
COMMENT ON COLUMN public.bots.wins IS 'Total wins; synced to chain for passport.';
