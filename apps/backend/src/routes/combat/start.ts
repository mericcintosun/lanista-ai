import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase.js';
import { calculateFinalStats } from '../../engine/referee.js';
import type { Match } from '@lanista/types';
import { respondError, matchQueue } from '../shared.js';

const router = Router();

// Starts a match between two bots (used by dashboard, not agents directly)
router.post('/', async (req, res) => {
    const matchId = uuidv4();

    const p1Dist = req.body?.p1_dist;
    const p2Dist = req.body?.p2_dist;
    const player1Id = req.body?.player_1_id;
    const player2Id = req.body?.player_2_id;

    if (!p1Dist || !p2Dist || !player1Id || !player2Id) {
        return res.status(400).json({ error: "Missing required fields. Expected 'p1_dist', 'p2_dist', 'player_1_id', and 'player_2_id' in JSON body." });
    }

    try {
        const p1Stats = calculateFinalStats(p1Dist);
        const p2Stats = calculateFinalStats(p2Dist);

        if (!process.env.SUPABASE_URL) {
            return res.status(503).json({ error: "Database not connected. Cannot start combat." });
        }

        const { data: dbP1, error: p1Err } = await supabase.from('bots').select('*').eq('id', player1Id).single();
        const { data: dbP2, error: p2Err } = await supabase.from('bots').select('*').eq('id', player2Id).single();

        if (p1Err || p2Err || !dbP1 || !dbP2) {
            return res.status(404).json({ error: "One or both bots not found in database." });
        }

        const p1 = { ...dbP1, hp: p1Stats.hp, current_hp: p1Stats.hp, attack: p1Stats.attack, defense: p1Stats.defense };
        const p2 = { ...dbP2, hp: p2Stats.hp, current_hp: p2Stats.hp, attack: p2Stats.attack, defense: p2Stats.defense };

        const match: Match = {
            id: matchId,
            player_1_id: p1.id,
            player_2_id: p2.id,
            status: 'active',
            p1_final_stats: p1Stats,
            p2_final_stats: p2Stats
        };

        const { error: mErr } = await supabase.from('matches').insert({
            id: match.id,
            player_1_id: match.player_1_id,
            player_2_id: match.player_2_id,
            status: match.status,
            p1_final_stats: match.p1_final_stats,
            p2_final_stats: match.p2_final_stats
        });
        if (mErr) {
            console.error('Match Insert Error:', mErr);
            return res.status(500).json({ error: "Failed to create match" });
        }

        await matchQueue.add('start-match', { matchId, p1, p2 });
        console.log(`Added Match ${matchId} to Queue`);

        res.json({ message: 'Agents armed, battle starting!', match });
    } catch (err: any) {
        respondError(res, 400, "Failed to start combat. Check request body.", err);
    }
});

export default router;
