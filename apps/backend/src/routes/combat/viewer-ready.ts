import { Router } from 'express';
import { redis } from '../shared.js';

const router = Router();

/**
 * POST /combat/viewer-ready
 * Called by the frontend when Unity WebGL has finished loading.
 * Sets a Redis key so the match worker knows it can start combat.
 * The key auto-expires after 60s as a safety net.
 */
router.post('/', async (req, res) => {
    const { matchId } = req.body;

    if (!matchId || typeof matchId !== 'string') {
        return res.status(400).json({ error: "matchId is required" });
    }

    const key = `match:${matchId}:viewer-ready`;
    await redis.set(key, '1', 'EX', 60); // expires in 60s as safety net

    console.log(`[ViewerReady] Signal received for match ${matchId}`);
    res.json({ ok: true });
});

export default router;
