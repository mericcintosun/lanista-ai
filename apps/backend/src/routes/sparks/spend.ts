import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { spendSpark } from '../../services/spark.js';

const router = Router();

/**
 * POST /api/sparks/spend
 * Body: { amount: number, type: string, reference_id?: string }
 * Deducts Sparks from the authenticated user (e.g. tomato throw, VIP chat, prediction).
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

    const { amount, type, reference_id } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const transactionType = typeof type === 'string' && type.trim() ? type.trim() : 'spend';
    const referenceId = typeof reference_id === 'string' ? reference_id : null;

    const result = await spendSpark(user.id, amount, transactionType, referenceId);

    if (!result.ok) {
      const status = result.error === 'Insufficient Spark balance' ? 402 : 400;
      return res.status(status).json({ error: result.error ?? 'Spend failed' });
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
