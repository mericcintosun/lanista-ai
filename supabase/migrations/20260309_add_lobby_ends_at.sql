-- Migration: Add lobby_ends_at to matches table
-- This column stores the server-authoritative timestamp at which the lobby
-- phase ends and combat may begin. Both the match-worker and the frontend
-- LobbyCountdown component read this value so clock-skew between the server
-- and client is eliminated.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lobby_ends_at timestamptz;

-- Back-fill existing active matches that don't yet have lobby_ends_at set.
-- For these, we compute it as created_at + 45 seconds (the hardcoded LOBBY_MIN_MS).
UPDATE public.matches
  SET lobby_ends_at = created_at + INTERVAL '45 seconds'
  WHERE lobby_ends_at IS NULL;

COMMENT ON COLUMN public.matches.lobby_ends_at IS
  'Server-authoritative timestamp at which the 45-second lobby phase ends. '
  'Set at match creation to eliminate clock-skew between backend worker and frontend countdown.';
