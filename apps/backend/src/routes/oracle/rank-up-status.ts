import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { getRankUpLootResult } from '../../services/rankUpLoot.js';
import { respondError } from '../shared.js';

const router = Router();

/**
 * GET /api/oracle/rank-up-status/:botId
 * Returns the latest rank-up loot request for the bot: pending or fulfilled.
 * When fulfilled, itemId is set and the DB row is updated.
 */
router.get('/:botId', async (req, res) => {
  const { botId } = req.params;
  if (!botId) return res.status(400).json({ error: 'botId is required' });

  try {
    const { data: rows, error } = await supabase
      .from('rank_up_loot_requests')
      .select('id, request_id, wallet_address, new_rank_index, match_id, item_id, fulfilled_at, created_at')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const latest = rows?.[0];
    if (!latest) {
      return res.json({ found: false });
    }

    let fulfilled = !!latest.fulfilled_at;
    let itemId = latest.item_id ?? null;

    if (!fulfilled && latest.request_id) {
      const result = await getRankUpLootResult(latest.request_id);
      if (result?.fulfilled) {
        fulfilled = true;
        itemId = result.itemId;
        await supabase
          .from('rank_up_loot_requests')
          .update({ item_id: result.itemId, fulfilled_at: new Date().toISOString() })
          .eq('id', latest.id);
      }
    }

    return res.json({
      found: true,
      requestId: latest.request_id,
      walletAddress: latest.wallet_address,
      newRankIndex: latest.new_rank_index,
      matchId: latest.match_id,
      itemId,
      fulfilled,
      fulfilledAt: latest.fulfilled_at,
      createdAt: latest.created_at,
    });
  } catch (e) {
    respondError(res, 500, 'Failed to fetch rank-up status.', e as Error);
  }
});

export default router;
