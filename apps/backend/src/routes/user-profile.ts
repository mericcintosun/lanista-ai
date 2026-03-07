import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Invalid token" });

        // Fetch User's bots
        const { data: bots, error: botsErr } = await supabase.from('bots').select('*').eq('owner_id', user.id);
        
        const activeAgents = bots ? bots.length : 0;
        let arenaPoints = 0;
        let totalWins = 0;
        let totalLosses = 0;

        if (bots && bots.length > 0) {
            bots.forEach(bot => {
                arenaPoints += bot.arena_points || 0;
                totalWins += bot.wins || 0;
                totalLosses += bot.losses || 0;
            });
        }
        
        const totalMatches = totalWins + totalLosses;
        const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
        
        return res.json({
            profile: {
                activeAgents,
                arenaPoints,
                totalMatches,
                winRate,
                rank: "Diamond IV", // Mocking rank for now
                firstName: user.user_metadata?.first_name || '',
                lastName: user.user_metadata?.last_name || '',
                agents: bots || []
            }
        });

    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
