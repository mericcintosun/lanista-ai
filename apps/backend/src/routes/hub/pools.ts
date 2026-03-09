import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';

const router = Router();

/**
 * GET /api/hub/pools/:matchId
 *
 * Aggregates all spark_transactions with type support_player_1 and
 * support_player_2 for the given match and returns the two pool totals.
 * Used by the frontend SupportPanel to show real-time global pool sizes.
 */
router.get('/:matchId', async (req, res) => {
  const { matchId } = req.params;

  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  try {
    const { data, error } = await supabase
      .from('spark_transactions')
      .select('amount, transaction_type')
      .eq('reference_id', matchId)
      .in('transaction_type', ['support_player_1', 'support_player_2']);

    if (error) return res.status(500).json({ error: 'Failed to load pools' });

    let bluePool = 0;
    let greenPool = 0;

    for (const row of data ?? []) {
      const amt = Math.abs(Number(row.amount));
      if (row.transaction_type === 'support_player_1') bluePool += amt;
      if (row.transaction_type === 'support_player_2') greenPool += amt;
    }

    return res.json({ bluePool, greenPool });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load pools' });
  }
});

export default router;
