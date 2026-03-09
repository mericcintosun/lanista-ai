import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { getBalance } from '../../services/spark.js';

const router = Router();

/**
 * GET /api/sparks/balance
 * Returns Spark balance for the authenticated user (Supabase JWT).
 */
router.get('/', async (req, res) => {
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

    const { balance, wallet_address } = await getBalance(user.id);
    return res.json({ balance, wallet_address: wallet_address ?? undefined });
  } catch (err: any) {
    console.error('[Spark] balance error:', err);
    return res.status(500).json({ error: 'Failed to get balance' });
  }
});

export default router;
