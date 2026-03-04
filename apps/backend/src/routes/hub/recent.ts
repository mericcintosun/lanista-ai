import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

// Returns the last 10 finished matches
router.get('/', async (req, res) => {
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('*, player_1:bots!matches_player_1_id_fkey(id, name, avatar_url), player_2:bots!matches_player_2_id_fkey(id, name, avatar_url)')
            .eq('status', 'finished')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        res.json({ matches: matches || [] });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch recent matches.", error);
    }
});

export default router;
