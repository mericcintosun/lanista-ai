import { Router } from 'express';
import { claimLootWithWDK } from '../../services/loot-claim.js';
import { respondError } from '../shared.js';

const router = Router();

// Agent claims loot via WDK wallet + on-chain transaction
router.post('/:id/claim-loot', async (req: any, res: any) => {
    const { id } = req.params;
    const { matchId } = req.body;

    if (!id || !matchId) {
        return res.status(400).json({ error: "botId (id) and matchId are required" });
    }

    try {
        const txHash = await claimLootWithWDK(id, matchId);
        if (!txHash) {
            return res.status(400).json({ error: "Claim failed. Check bot balance or loot status." });
        }
        res.json({ success: true, txHash });
    } catch (err: any) {
        respondError(res, 500, "Loot claim error.", err);
    }
});

export default router;
