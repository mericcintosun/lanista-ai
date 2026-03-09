import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { respondError } from './shared.js';

const router = Router();

const TIER_ELO: Record<string, { min: number; max: number | null }> = {
    IRON: { min: 0, max: 30 },
    BRONZE: { min: 30, max: 100 },
    SILVER: { min: 100, max: 200 },
    GOLD: { min: 200, max: 350 },
    PLATINUM: { min: 350, max: 600 },
    DIAMOND: { min: 600, max: 1000 },
    MASTER: { min: 1000, max: null },
};

// Global ELO rankings with pagination and optional tier filter
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
        const tier = typeof req.query.tier === 'string' && TIER_ELO[req.query.tier.toUpperCase()]
            ? req.query.tier.toUpperCase()
            : null;

        let query = supabase
            .from('bots')
            .select('id, name, avatar_url, description, elo, total_matches, reputation_score, wins', { count: 'exact' })
            .order('elo', { ascending: false });

        if (tier) {
            const { min, max } = TIER_ELO[tier];
            query = query.gte('elo', min);
            if (max !== null) query = query.lt('elo', max);
        }

        const from = (page - 1) * limit;
        const { data: bots, error: botErr, count } = await query.range(from, from + limit - 1);

        if (botErr) throw botErr;
        const total = count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        if (!bots || bots.length === 0) {
            return res.json({
                leaderboard: [],
                total,
                page,
                limit,
                totalPages,
            });
        }

        // Fetch all finished matches via pagination to compute accurate stats
        let allMatches: any[] = [];
        let matchPageNum = 0;
        while (true) {
            const { data: matchPage, error: matchErr } = await supabase
                .from('matches')
                .select('winner_id, player_1_id, player_2_id')
                .eq('status', 'finished')
                .range(matchPageNum * 1000, (matchPageNum + 1) * 1000 - 1);

            if (matchErr) throw matchErr;
            if (!matchPage || matchPage.length === 0) break;
            allMatches.push(...matchPage);
            if (matchPage.length < 1000) break;
            matchPageNum++;
        }

        const winsMap: Record<string, number> = {};
        const totalMap: Record<string, number> = {};
        (allMatches || []).forEach(m => {
            if (m.player_1_id) totalMap[m.player_1_id] = (totalMap[m.player_1_id] || 0) + 1;
            if (m.player_2_id) totalMap[m.player_2_id] = (totalMap[m.player_2_id] || 0) + 1;
            if (m.winner_id) winsMap[m.winner_id] = (winsMap[m.winner_id] || 0) + 1;
        });

        // Prefer DB values (reputation_score, wins) — kept in sync with ERC-8004 passport on chain
        const leaderboard = bots.map((b: Record<string, unknown>) => {
            const totalMatches = (b.total_matches as number) ?? totalMap[b.id as string] ?? 0;
            const wins = (b.wins as number) ?? winsMap[b.id as string] ?? 0;
            const elo = (b.elo as number) ?? 0;
            const winRate = totalMatches > 0 ? wins / totalMatches : 0;
            const reputationScore = Number(b.reputation_score) ?? 0;
            return {
                id: b.id, name: b.name, avatar_url: b.avatar_url, description: b.description,
                elo, totalMatches, wins, winRate, reputationScore
            };
        }).sort((a, b) => {
            const aPlayed = a.totalMatches > 0 ? 1 : 0;
            const bPlayed = b.totalMatches > 0 ? 1 : 0;
            if (bPlayed !== aPlayed) return bPlayed - aPlayed;
            if (b.elo !== a.elo) return b.elo - a.elo;
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.totalMatches - a.totalMatches;
        });

        res.json({ leaderboard, total, page, limit, totalPages });
    } catch (error: unknown) {
        respondError(res, 500, "Failed to fetch leaderboard.", error);
    }
});

export default router;
