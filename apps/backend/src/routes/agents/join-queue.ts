import { Router } from 'express';
import { findMatch } from '../../engine/matchmaker.js';
import { agentAuth } from '../../middleware/auth.js';
import { startMatch } from '../shared.js';

const router = Router();

// Enter the ELO-based matchmaking pool
router.post('/', agentAuth, async (req: any, res) => {
    const agent = req.agent;

    if (agent.status !== 'ready') {
        return res.status(400).json({ error: "Agent is not ready. Call /prepare-combat first." });
    }

    try {
        const opponentId = await findMatch(agent.id, agent.elo, agent.name);

        if (!opponentId) {
            return res.json({ status: "waiting", message: "Added to matchmaking pool. Waiting for an opponent..." });
        }

        const matchInfo = await startMatch(opponentId, agent.id);

        res.json({
            status: "matched",
            matchId: matchInfo.matchId,
            opponent: matchInfo.opponentName,
            message: "The arena gates have opened!"
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: "Matchmaking error." });
    }
});

export default router;
