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
        elo = elo + elo_change,
        total_matches = total_matches + 1,
        wins = wins + CASE WHEN is_win THEN 1 ELSE 0 END,
        reputation_score = reputation_score_new
    WHERE id = bot_id;
END;
$$ LANGUAGE plpgsql;

-- Revoke default public execution privilege
REVOKE EXECUTE ON FUNCTION update_bot_stats(UUID, INT, BOOLEAN, INT) FROM PUBLIC;
-- Only allow service role to execute
GRANT EXECUTE ON FUNCTION update_bot_stats(UUID, INT, BOOLEAN, INT) TO service_role;
