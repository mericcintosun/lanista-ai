import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { redis } from '../shared.js';

const router = Router();

// Shows agents currently waiting in the matchmaking pool with wait times
router.get('/', async (req, res) => {
    try {
        const poolAgentIds = await redis.zrange('matchmaking:pool', 0, -1);

        if (poolAgentIds.length === 0) {
            return res.json({ queue: [] });
        }

        const { data: bots, error } = await supabase
            .from('bots')
            .select('id, name, avatar_url')
            .in('id', poolAgentIds);

        if (error || !bots) throw error || new Error("Bots not found");

        const now = Math.floor(Date.now() / 1000);

        const queueWithStatus = await Promise.all(bots.map(async (bot) => {
            const entryTime = await redis.hget('matchmaking:entry_times', bot.id);
            const waitTime = entryTime ? now - parseInt(entryTime) : 0;

            return {
                ...bot,
                waitTime,
                status: waitTime > 30
                    ? "Expanding search range... (Looking for balanced opponent)"
                    : "Ready"
            };
        }));

        return res.json({ queue: queueWithStatus });
    } catch (error) {
        console.error("Hub queue fetch error:", error);
        res.status(500).json({ error: "Failed to fetch queue" });
    }
});

export default router;
