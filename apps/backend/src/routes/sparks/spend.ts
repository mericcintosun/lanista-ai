import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { spendSpark } from '../../services/spark.js';
import { distributeBotRewards } from '../../services/bot-reward.js';

const router = Router();

/**
 * POST /api/sparks/spend
 * Body: { amount: number, type: string, reference_id?: string }
 * Deducts Sparks from the authenticated user (e.g. tomato throw, VIP chat, prediction).
 * On success, asynchronously distributes 10% of the spent Spark value (in AVAX)
 * equally to all bots owned by the spending user.
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

    const { amount, type, reference_id, enable_bot_rewards } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const transactionType = typeof type === 'string' && type.trim() ? type.trim() : 'spend';
    const referenceId = typeof reference_id === 'string' ? reference_id : null;
    const botRewardsEnabled = enable_bot_rewards !== false;

    // ── Pre-Spend Validations for Predictions ─────────────────────────────
    if (referenceId && (transactionType === 'support_player_1' || transactionType === 'support_player_2')) {
      // 1. Check if the lobby window is still open
      const { data: match } = await supabase
        .from('matches')
        .select('lobby_ends_at')
        .eq('id', referenceId)
        .single();

      if (match?.lobby_ends_at) {
        if (Date.now() > new Date(match.lobby_ends_at as unknown as string).getTime()) {
          return res.status(403).json({ error: 'Lobby phase is closed. Combat has already started.' });
        }
      }

      // 2. Check if user already supported a side for this match
      const { data: existingSupports } = await supabase
        .from('spark_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_id', referenceId)
        .in('transaction_type', ['support_player_1', 'support_player_2'])
        .limit(1);

      if (existingSupports && existingSupports.length > 0) {
        return res.status(403).json({ error: 'You have already placed a prediction on this match.' });
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const result = await spendSpark(user.id, amount, transactionType, referenceId);

    if (!result.ok) {
      const status = result.error === 'Insufficient Spark balance' ? 402 : 400;
      return res.status(status).json({ error: result.error ?? 'Spend failed' });
    }

    if (botRewardsEnabled) {
      distributeBotRewards(user.id, amount).catch(() => {});
    }

    return res.json({
      success: true,
      newBalance: result.newBalance,
      spent: amount,
      type: transactionType,
    });
  } catch (err: any) {
    console.error('[Spark] spend error:', err);
    return res.status(500).json({ error: 'Failed to spend Sparks' });
  }
});

export default router;
