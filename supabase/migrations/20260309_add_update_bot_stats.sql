-- Create the update_bot_stats RPC function used by match-worker.ts
-- This was already applied via Supabase Dashboard, this file is for reference.

CREATE OR REPLACE FUNCTION public.update_bot_stats(
  bot_id uuid,
  elo_change int,
  is_win boolean,
  reputation_score_new int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF bot_id IS NULL THEN
    RAISE EXCEPTION 'bot_id cannot be null';
  END IF;

  UPDATE public.bots
  SET
    elo = GREATEST(0, COALESCE(elo, 0) + elo_change),
    wins = COALESCE(wins, 0) + CASE WHEN is_win THEN 1 ELSE 0 END,
    total_matches = COALESCE(total_matches, 0) + 1,
    reputation_score = reputation_score_new
  WHERE id = bot_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_bot_stats(uuid, int, boolean, int) FROM public;
