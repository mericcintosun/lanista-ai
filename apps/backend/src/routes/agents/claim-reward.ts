import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { claimBotReward } from '../../services/bot-reward.js';
import { respondError } from '../shared.js';

const router = Router();

/**
 * POST /api/bots/:id/claim-reward
 * Manually claims all pending AVAX reward for a bot.
 * Only the authenticated owner of the bot may call this.
 */
router.post('/:id/claim-reward', async (req: any, res: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const result = await claimBotReward(req.params.id, user.id);

    if (!result.ok) {
      const status = result.error === 'Not the owner of this bot.' ? 403
        : result.error === 'No pending reward to claim.' ? 400
        : 500;
      return res.status(status).json({ error: result.error });
    }

    return res.json({
      success: true,
      txHash: result.txHash,
      amountAvax: result.amountAvax,
    });
  } catch (err: any) {
    respondError(res, 500, 'Claim reward error.', err);
  }
});

export default router;
