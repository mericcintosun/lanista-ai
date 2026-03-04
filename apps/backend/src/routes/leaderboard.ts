import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { respondError } from './shared.js';

const router = Router();

// Global ELO rankings with effective ELO sorting
router.get('/', async (req, res) => {
    try {
        // Fetch bots sorted by ELO (descending)
        const { data: bots, error: botErr } = await supabase
            .from('bots')
            .select('id, name, avatar_url, description, elo, total_matches')
            .order('elo', { ascending: false })
            .limit(50);

        if (botErr) throw botErr;
        if (!bots) return res.json({ leaderboard: [] });

        // Fetch all finished matches via pagination to compute accurate stats
        let allMatches: any[] = [];
        let page = 0;
        while (true) {
            const { data: matchPage, error: matchErr } = await supabase
                .from('matches')
                .select('winner_id, player_1_id, player_2_id')
                .eq('status', 'finished')
                .range(page * 1000, (page + 1) * 1000 - 1);

            if (matchErr) throw matchErr;
            if (!matchPage || matchPage.length === 0) break;
            allMatches.push(...matchPage);
            if (matchPage.length < 1000) break;
            page++;
        }

        // Count wins and totalMatches per bot
        const winsMap: Record<string, number> = {};
        const totalMap: Record<string, number> = {};

        (allMatches || []).forEach(m => {
            if (m.player_1_id) totalMap[m.player_1_id] = (totalMap[m.player_1_id] || 0) + 1;
            if (m.player_2_id) totalMap[m.player_2_id] = (totalMap[m.player_2_id] || 0) + 1;
            if (m.winner_id) winsMap[m.winner_id] = (winsMap[m.winner_id] || 0) + 1;
        });

        const leaderboard = bots.map(b => {
            const totalMatches = totalMap[b.id] ?? 0;
            const wins = winsMap[b.id] ?? 0;
            const elo = b.elo ?? 0;
            const winRate = totalMatches > 0 ? wins / totalMatches : 0;

            // LOGIC FIX: Prevent bots with sub-50% win rate from outranking positive bots.
            // We compute an effective ELO for sorting only (does not modify actual ELO).
            const effectiveElo = winRate < 0.5 && totalMatches > 0 ? elo * (winRate / 0.5) : elo;

            return {
                id: b.id, name: b.name, avatar_url: b.avatar_url, description: b.description,
                elo, effectiveElo, totalMatches, wins, winRate
            };
        })
            .sort((a, b) => {
                // 1. Bots with zero matches go to the bottom
                const aPlayed = a.totalMatches > 0 ? 1 : 0;
                const bPlayed = b.totalMatches > 0 ? 1 : 0;
                if (bPlayed !== aPlayed) return bPlayed - aPlayed;

                // 2. Sort by effective ELO (heavily penalizes sub-50% win rate bots)
                if (Math.abs(b.effectiveElo - a.effectiveElo) > 5) return b.effectiveElo - a.effectiveElo;

                // 3. If ELO is close: tiebreak by ELO, then net wins, then total matches
                if (b.elo !== a.elo) return b.elo - a.elo;
                const netA = a.wins - (a.totalMatches - a.wins);
                const netB = b.wins - (b.totalMatches - b.wins);
                if (netA !== netB) return netB - netA;
                if (b.winRate !== a.winRate) return b.winRate - a.winRate;
                return b.totalMatches - a.totalMatches;
            });

        res.json({ leaderboard });

    } catch (error: any) {
        respondError(res, 500, "Failed to fetch leaderboard.", error);
    }
});

export default router;
