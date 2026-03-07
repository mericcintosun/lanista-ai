import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';

const router = Router();

/**
 * GET /api/sparks/predictions/:matchId
 * Returns pool totals per bot and the authenticated user's prediction (if any).
 */
router.get('/:matchId', async (req, res) => {
  try {
    const matchId = req.params.matchId;
    if (!matchId) {
      return res.status(400).json({ error: 'match_id required' });
    }

    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { data: predictions, error: predErr } = await supabase
      .from('match_predictions')
      .select('user_id, predicted_bot_id, amount')
      .eq('match_id', matchId)
      .eq('status', 'pending');

    if (predErr) {
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    const pool: Record<string, number> = {};
    let myPrediction: { predicted_bot_id: string; amount: number } | null = null;

    for (const p of predictions ?? []) {
      const botId = p.predicted_bot_id as string;
      pool[botId] = (pool[botId] ?? 0) + (p.amount as number);
      if (userId && p.user_id === userId) {
        myPrediction = { predicted_bot_id: botId, amount: p.amount as number };
      }
    }

    return res.json({
      pool,
      myPrediction,
    });
  } catch (err: any) {
    console.error('[Spark] predictions error:', err);
    return res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

export default router;
