-- Fix: ensure bots with NULL elo (registered before explicit default) are set to 0
UPDATE bots SET elo = 0 WHERE elo IS NULL;
UPDATE bots SET wins = 0 WHERE wins IS NULL;
UPDATE bots SET total_matches = 0 WHERE total_matches IS NULL;

-- Update the RPC to use COALESCE so NULL values never break arithmetic again
CREATE OR REPLACE FUNCTION update_bot_stats(
    bot_id UUID,
    elo_change INT,
    is_win BOOLEAN,
    reputation_score_new INT
) RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE bots
    SET 
        elo = COALESCE(elo, 0) + elo_change,
        total_matches = COALESCE(total_matches, 0) + 1,
        wins = COALESCE(wins, 0) + CASE WHEN is_win THEN 1 ELSE 0 END,
        reputation_score = reputation_score_new
    WHERE id = bot_id;
END;
$$ LANGUAGE plpgsql;

-- Revoke default public execution privilege
REVOKE EXECUTE ON FUNCTION update_bot_stats(UUID, INT, BOOLEAN, INT) FROM PUBLIC;
-- Only allow service role to execute
GRANT EXECUTE ON FUNCTION update_bot_stats(UUID, INT, BOOLEAN, INT) TO service_role;
