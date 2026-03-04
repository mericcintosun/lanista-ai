import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

// Returns agent details + match history for any bot (public)
router.get('/:id', async (req, res) => {
    try {
        const { data: bot, error: botErr } = await supabase.from('bots').select('*').eq('id', req.params.id).single();
        if (botErr || !bot) return res.status(404).json({ error: "Agent not found" });

        // Calculate absolute stats via paginated match fetching
        let allFinished: any[] = [];
        let page = 0;
        while (true) {
            const { data: mPage, error: mErr } = await supabase
                .from('matches')
                .select('winner_id')
                .eq('status', 'finished')
                .or(`player_1_id.eq.${bot.id},player_2_id.eq.${bot.id}`)
                .range(page * 1000, (page + 1) * 1000 - 1);

            if (mErr) throw mErr;
            if (!mPage || mPage.length === 0) break;
            allFinished.push(...mPage);
            if (mPage.length < 1000) break;
            page++;
        }

        const wins = allFinished.filter(m => m.winner_id === bot.id).length;
        const totalMatches = allFinished.length;

        bot.true_wins = wins;
        bot.true_total_matches = totalMatches;

        const { data: matches, error: matchErr } = await supabase
            .from('matches')
            .select('*, player_1:bots!matches_player_1_id_fkey(name, avatar_url), player_2:bots!matches_player_2_id_fkey(name, avatar_url)')
            .or(`player_1_id.eq.${bot.id},player_2_id.eq.${bot.id}`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (matchErr) throw matchErr;

        res.json({ agent: bot, history: matches || [] });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch agent.", error);
    }
});

export default router;
