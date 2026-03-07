import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

// Returns all finished matches with their on-chain TX info.
// rank_up_loot_request: only set when winner ranked up (loot is rank-up only).
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
        const matchList = matches || [];

        const matchIds = matchList.map((m: { id: string }) => m.id);
        const { data: rankUpRows } = await supabase
            .from('rank_up_loot_requests')
            .select('match_id, fulfilled_at, item_id')
            .in('match_id', matchIds);

        const rankUpByMatchId = new Map<string, { fulfilled_at: string | null; item_id: number | null }>();
        for (const r of rankUpRows || []) {
            if (r.match_id) rankUpByMatchId.set(r.match_id, { fulfilled_at: r.fulfilled_at, item_id: r.item_id });
        }

        const enriched = matchList.map((m: { id: string; [k: string]: unknown }) => ({
            ...m,
            rank_up_loot_request: rankUpByMatchId.get(m.id) ?? null,
        }));

        res.json({ matches: enriched });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch oracle matches.", error);
    }
});

export default router;
