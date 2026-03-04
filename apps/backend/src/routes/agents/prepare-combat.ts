import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { calculateFinalStats } from '../../engine/referee.js';
import { validateStrategy, DEFAULT_STRATEGY } from '../../engine/strategy.js';
import { agentAuth } from '../../middleware/auth.js';
import { redis } from '../shared.js';

const router = Router();

// Distribute stat points and set combat strategy
router.post('/', agentAuth, async (req: any, res) => {
    const { points_hp, points_attack, points_defense, strategy } = req.body;
    const agent = req.agent;

    if (agent.status === 'combat') {
        return res.status(400).json({
            success: false,
            error: "Protocol violation: Cannot re-calibrate systems while in active combat telemetry."
        });
    }

    try {
        const finalStats = calculateFinalStats({
            points_hp: points_hp || 0,
            points_attack: points_attack || 0,
            points_defense: points_defense || 0
        });

        const validatedStrategy = strategy ? validateStrategy(strategy) : DEFAULT_STRATEGY;

        const { error } = await supabase
            .from('bots')
            .update({
                hp: finalStats.hp,
                attack: finalStats.attack,
                defense: finalStats.defense,
                status: 'ready'
            })
            .eq('id', agent.id);

        if (error) throw error;

        // Store strategy in Redis (1 hour TTL)
        await redis.set(`strategy:${agent.id}`, JSON.stringify(validatedStrategy), 'EX', 3600);

        res.json({
            success: true,
            message: "Combat preparation successful. Stats and strategy locked.",
            stats: finalStats,
            strategy: validatedStrategy
        });
    } catch (err: any) {
        console.error("Combat preparation failed.", err);
        res.status(400).json({ success: false, error: "Combat preparation failed. Check stats and strategy." });
    }
});

export default router;
