import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { getLootForMatch } from '../../services/loot.js';
import { getRankUpLootResult } from '../../services/rankUpLoot.js';
import { respondError } from '../shared.js';

const router = Router();

// Fetches Chainlink VRF loot details for a specific match.
// Supports both legacy LootChest (per-match) and new RankUpLootNFT (rank-up request by match_id).
router.get('/:matchId', async (req, res) => {
    const { matchId } = req.params;

    if (!matchId) {
        return res.status(400).json({ error: "matchId is required" });
    }

    try {
        // New flow: rank-up NFT — check rank_up_loot_requests first
        const { data: rankUpRow } = await supabase
            .from('rank_up_loot_requests')
            .select('request_id, wallet_address')
            .eq('match_id', matchId)
            .limit(1)
            .maybeSingle();

        if (rankUpRow?.request_id) {
            const result = await getRankUpLootResult(rankUpRow.request_id);
            if (result) {
                const loot = {
                    fulfilled: result.fulfilled,
                    winner: result.botWallet,
                    itemId: result.itemId,
                    randomness: '',
                    timestamp: 0,
                    requestId: rankUpRow.request_id,
                };
                if (result.fulfilled && Number.isFinite(result.itemId)) {
                    try {
                        await supabase
                            .from('matches')
                            .update({ winner_loot_item_id: result.itemId })
                            .eq('id', matchId);
                    } catch (e) {
                        console.warn('[Loot] Failed to persist winner_loot_item_id (rank-up):', (e as any)?.message || e);
                    }
                }
                return res.json({ found: true, loot });
            }
        }

        // Legacy: LootChest (per-match loot)
        const loot = await getLootForMatch(matchId);
        if (!loot) {
            return res.json({ found: false });
        }
        if (loot.fulfilled && Number.isFinite(loot.itemId)) {
            try {
                await supabase
                    .from('matches')
                    .update({ winner_loot_item_id: loot.itemId })
                    .eq('id', matchId);
            } catch (e) {
                console.warn('[Loot] Failed to persist winner_loot_item_id:', (e as any)?.message || e);
            }
        }
        return res.json({ found: true, loot });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch loot for match.", error);
    }
});

export default router;
