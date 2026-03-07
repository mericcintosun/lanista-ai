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

        // 1. Fetch data from public.profiles table
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // 2. Fetch User's bots
        const { data: bots, error: botsErr } = await supabase.from('bots').select('*').eq('owner_id', user.id);
        
        const activeAgents = bots ? bots.length : 0;
        let arenaPoints = 0;
        let totalWins = 0;
        let totalLosses = 0;
        let highestElo = 0;

        if (bots && bots.length > 0) {
            bots.forEach(bot => {
                arenaPoints += bot.arena_points || 0;
                totalWins += bot.wins || 0;
                totalLosses += bot.losses || 0;
                if (bot.elo > highestElo) highestElo = bot.elo;
            });
        }
        
        const totalMatches = totalWins + totalLosses;
        const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

        // Simple Tier Calculation (Match frontend logic)
        const getRankName = (elo: number, played: boolean) => {
            if (!played) return 'IRON';
            if (elo >= 1000) return 'MASTER';
            if (elo >= 600) return 'DIAMOND';
            if (elo >= 350) return 'PLATINUM';
            if (elo >= 200) return 'GOLD';
            if (elo >= 100) return 'SILVER';
            if (elo >= 30) return 'BRONZE';
            return 'IRON';
        };

        const rankName = getRankName(highestElo, totalMatches > 0);

        // Use profiles table data, fall back to user_metadata if profile row doesn't exist yet
        const metadata = user.user_metadata || {};
        
        return res.json({
            profile: {
                activeAgents,
                arenaPoints,
                totalMatches,
                winRate,
                rank: rankName,
                firstName: metadata.first_name || '',
                lastName: metadata.last_name || '',
                role: profile?.role || null,
                callsign: profile?.callsign || '',
                bio: profile?.bio || '',
                sector: profile?.sector || '',
                onboardingCompleted: profile?.onboarding_completed === true,
                agents: bots || []
            }
        });


    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/complete', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Invalid token" });

        const { role, callsign, bio, sector } = req.body;

        // Update the public.profiles table
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                role,
                callsign,
                bio,
                sector,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return res.json({ message: "Profile synchronized with Arena Command.", success: true });

    } catch (error: any) {
        console.error("Profile completion error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

export default router;
