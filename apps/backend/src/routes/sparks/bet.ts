import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { placeBet } from '../../services/spark.js';

const router = Router();

/**
 * POST /api/sparks/bet
 * Body: { match_id: string, predicted_bot_id: string, amount: number }
 * Places a prediction bet (atomic). Match must be in preparing/pending. One bet per user per match.
 */
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { match_id, predicted_bot_id, amount } = req.body;
    if (typeof match_id !== 'string' || !match_id.trim()) {
      return res.status(400).json({ error: 'Invalid match_id' });
    }
    if (typeof predicted_bot_id !== 'string' || !predicted_bot_id.trim()) {
      return res.status(400).json({ error: 'Invalid predicted_bot_id' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, status, player_1_id, player_2_id')
      .eq('id', match_id.trim())
      .single();

    if (matchErr || !match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    const status = (match as { status: string }).status;
    if (status !== 'preparing' && status !== 'pending') {
      return res.status(400).json({ error: 'Betting is only allowed before the match starts' });
    }

    const p1 = (match as { player_1_id: string }).player_1_id;
    const p2 = (match as { player_2_id: string }).player_2_id;
    if (predicted_bot_id !== p1 && predicted_bot_id !== p2) {
      return res.status(400).json({ error: 'predicted_bot_id must be one of the match bots' });
    }

    const result = await placeBet(user.id, match_id.trim(), predicted_bot_id.trim(), amount);

    if (!result.ok) {
      const statusCode = result.error === 'Insufficient Spark balance' ? 402 : 400;
      return res.status(statusCode).json({ error: result.error ?? 'Bet failed' });
    }

    return res.json({
      success: true,
      predictionId: result.predictionId,
      newBalance: result.newBalance,
    });
  } catch (err: any) {
    console.error('[Spark] bet error:', err);
    return res.status(500).json({ error: 'Failed to place bet' });
  }
});

export default router;
