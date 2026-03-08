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
