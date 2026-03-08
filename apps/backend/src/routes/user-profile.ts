import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.get('/public/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username || username.length < 2) return res.status(400).json({ error: "Invalid username" });

        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('id, callsign, bio, sector, role, avatar_url, banner_url, x_url, discord_url, website_url, public_username')
            .eq('public_username', username)
            .single();

        if (profileErr || !profile) return res.status(404).json({ error: "Profile not found" });

        const { data: bots } = await supabase
            .from('bots')
            .select('id, name, avatar_url, elo, total_matches, wins, losses')
            .eq('owner_id', profile.id);

        let highestElo = 0;
        let totalWins = 0;
        let totalLosses = 0;
        (bots || []).forEach((bot: { elo?: number; wins?: number; losses?: number }) => {
            if ((bot.elo ?? 1200) > highestElo) highestElo = bot.elo ?? 1200;
            totalWins += bot.wins ?? 0;
            totalLosses += bot.losses ?? 0;
        });
        const totalMatches = totalWins + totalLosses;
        const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

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

        return res.json({
            profile: {
                callsign: profile.callsign,
                bio: profile.bio,
                sector: profile.sector,
                role: profile.role,
                avatarUrl: profile.avatar_url,
                bannerUrl: profile.banner_url,
                xUrl: profile.x_url,
                discordUrl: profile.discord_url,
                websiteUrl: profile.website_url,
                publicUsername: profile.public_username,
                activeAgents: bots?.length ?? 0,
                totalMatches,
                winRate,
                rank: getRankName(highestElo, totalMatches > 0),
                agents: bots || []
            }
        });
    } catch (error) {
        console.error("Public profile fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

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
                avatarUrl: profile?.avatar_url || null,
                bannerUrl: profile?.banner_url || null,
                xUrl: profile?.x_url || null,
                discordUrl: profile?.discord_url || null,
                websiteUrl: profile?.website_url || null,
                publicUsername: profile?.public_username || null,
                onboardingCompleted: profile?.onboarding_completed === true,
                agents: bots || []
            }
        });


    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.patch('/', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Invalid token" });

        const { role, callsign, bio, sector, avatarUrl, bannerUrl, xUrl, discordUrl, websiteUrl, publicUsername } = req.body;

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };
        if (role !== undefined) updates.role = role;
        if (callsign !== undefined) updates.callsign = callsign;
        if (bio !== undefined) updates.bio = bio;
        if (sector !== undefined) updates.sector = sector;
        if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
        if (bannerUrl !== undefined) updates.banner_url = bannerUrl;
        if (xUrl !== undefined) updates.x_url = xUrl;
        if (discordUrl !== undefined) updates.discord_url = discordUrl;
        if (websiteUrl !== undefined) updates.website_url = websiteUrl;
        if (publicUsername !== undefined) updates.public_username = publicUsername;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;

        return res.json({ message: "Profile updated.", success: true });
    } catch (error: any) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

const CALLSIGN_ADJECTIVES = ['SHADOW', 'NOVA', 'IRON', 'CYBER', 'STORM', 'GHOST', 'DARK', 'NEON', 'STEEL', 'VOID', 'APEX', 'ROGUE', 'DELTA', 'OMEGA', 'ZERO'];
const CALLSIGN_NOUNS = ['WOLF', 'BLADE', 'HAWK', 'WRAITH', 'FORGE', 'PULSE', 'RIFT', 'VIPER', 'TITAN', 'EDGE', 'CLAW', 'SURGE', 'NEXUS', 'DUSK', 'FLUX'];

function generateCallsign(userId: string): string {
    const adj = CALLSIGN_ADJECTIVES[Math.floor(Math.random() * CALLSIGN_ADJECTIVES.length)];
    const noun = CALLSIGN_NOUNS[Math.floor(Math.random() * CALLSIGN_NOUNS.length)];
    const suffix = userId.replace(/-/g, '').slice(-4).toUpperCase();
    return `${adj}_${noun}_${suffix}`;
}

router.post('/auto-setup', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Invalid token" });

        const { data: existing } = await supabase
            .from('profiles')
            .select('onboarding_completed, callsign')
            .eq('id', user.id)
            .single();

        if (existing?.onboarding_completed) {
            return res.json({ success: true, callsign: existing.callsign });
        }

        const callsign = generateCallsign(user.id);
        const publicUsername = callsign.toLowerCase();

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                callsign,
                public_username: publicUsername,
                role: 'commander',
                sector: 'Sector 0x77-B',
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;

        return res.json({ success: true, callsign });
    } catch (error: any) {
        console.error("Auto-setup error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
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
