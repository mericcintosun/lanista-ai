import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

// Returns all finished matches with their on-chain TX info
router.get('/', async (req, res) => {
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select(`
        id, tx_hash, created_at, winner_id, player_1_id, player_2_id, winner_loot_item_id,
        player_1:bots!matches_player_1_id_fkey(name, avatar_url, wallet_address),
        player_2:bots!matches_player_2_id_fkey(name, avatar_url, wallet_address)
      `)
            .eq('status', 'finished')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json({ matches: matches || [] });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch oracle matches.", error);
    }
});

export default router;
