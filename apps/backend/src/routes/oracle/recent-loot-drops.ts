import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

/**
 * GET /api/oracle/recent-loot-drops?since=timestamp
 * Returns rank_up_loot_requests fulfilled in the last 5 minutes.
 * Used as fallback when Supabase Realtime doesn't fire.
 */
router.get('/', async (req, res) => {
  try {
    const since = req.query.since as string | undefined;
    const sinceDate = since ? new Date(Number(since)) : new Date(Date.now() - 5 * 60 * 1000);

    const { data, error } = await supabase
      .from('rank_up_loot_requests')
      .select('id, bot_id, new_rank_index, item_id, fulfilled_at')
      .not('fulfilled_at', 'is', null)
      .not('item_id', 'is', null)
      .gte('item_id', 1)
      .gte('fulfilled_at', sinceDate.toISOString())
      .order('fulfilled_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ drops: data ?? [] });
  } catch (e) {
    respondError(res, 500, 'Failed to fetch recent loot drops.', e as Error);
  }
});

export default router;
