import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { getLootForMatch } from '../../services/loot.js';
import { respondError } from '../shared.js';

const router = Router();

// Fetches Chainlink VRF loot details for a specific match
router.get('/:matchId', async (req, res) => {
    const { matchId } = req.params;

    if (!matchId) {
        return res.status(400).json({ error: "matchId is required" });
    }

    try {
        const loot = await getLootForMatch(matchId);
        if (!loot) {
            return res.json({ found: false });
        }
        // Persist fulfilled loot into matches table for analytics / fast reads
        if (loot.fulfilled && Number.isFinite(loot.itemId)) {
            try {
                await supabase
                    .from('matches')
                    .update({ winner_loot_item_id: loot.itemId })
                    .eq('id', matchId);
            } catch (e) {
                console.warn('[Loot] Failed to persist winner_loot_item_id to matches:', (e as any)?.message || e);
            }
        }
        return res.json({ found: true, loot });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch loot for match.", error);
    }
});

export default router;
