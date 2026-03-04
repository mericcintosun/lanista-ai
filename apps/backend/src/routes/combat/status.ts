import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

// Returns full match state + combat logs (main endpoint for Unity integration)
router.get('/', async (req, res) => {
    const { matchId } = req.query;

    if (!matchId || typeof matchId !== 'string') {
        return res.status(400).json({ error: "matchId is required" });
    }

    try {
        const { data: match, error: mErr } = await supabase
            .from('matches')
            .select('*, player_1:bots!matches_player_1_id_fkey(*), player_2:bots!matches_player_2_id_fkey(*)')
            .eq('id', matchId)
            .single();

        if (mErr || !match) {
            return res.status(404).json({ error: "Match not found" });
        }

        const { data: logs } = await supabase.from('combat_logs')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

        if (match.player_1) {
            match.player_1.current_hp = match.p1_current_hp ?? match.player_1.hp;
        }
        if (match.player_2) {
            match.player_2.current_hp = match.p2_current_hp ?? match.player_2.hp;
        }

        res.json({ match, logs: logs || [] });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch match status.", error);
    }
});

export default router;
