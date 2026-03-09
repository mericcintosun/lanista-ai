import { Router } from 'express';
import { redis } from '../shared.js';
import { supabase } from '../../lib/supabase.js';
import { creditWatchReward, WATCH_REWARD_COOLDOWN_SEC } from '../../services/spark.js';

const router = Router();

const REDIS_KEY_PREFIX = 'spark:watch:last_claim:';

/**
 * POST /api/sparks/claim-watch-reward
 * Claim Spark reward for watching. Rate limited via Redis (e.g. once per 10 minutes).
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

    const key = REDIS_KEY_PREFIX + user.id;
    const last = await redis.get(key);
    if (last) {
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        error: 'Cooldown active',
        retryAfterSeconds: Math.max(0, ttl),
        message: 'You can claim watch reward again in a few minutes.'
      });
    }

    // Set cooldown BEFORE crediting. If the DB write fails the cooldown is
    // rolled back (deleted), so the user can retry. This order prevents an
    // exploit where Redis becomes temporarily unavailable after a successful
    // DB credit, allowing unlimited claims.
    await redis.set(key, Date.now().toString(), 'EX', WATCH_REWARD_COOLDOWN_SEC);

    const result = await creditWatchReward(user.id);
    if (!result.ok) {
      // Rollback cooldown so the user is not permanently locked out
      await redis.del(key).catch(() => {});
      return res.status(500).json({ error: result.error ?? 'Failed to credit reward' });
    }

    return res.json({
      success: true,
      amount: result.amount,
      newBalance: result.newBalance,
      nextClaimInSeconds: WATCH_REWARD_COOLDOWN_SEC
    });
  } catch (err: any) {
    console.error('[Spark] claim-watch-reward error:', err);
    return res.status(500).json({ error: 'Failed to claim reward' });
  }
});

export default router;
