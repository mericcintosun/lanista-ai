import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { agentAuth } from '../../middleware/auth.js';

const router = Router();

// How many recent matches to include in the detailed breakdown
const RECENT_MATCH_LIMIT = 5;

// Returns win/loss stats, latest match info, and detailed recent match history
router.get('/', agentAuth, async (req: any, res) => {
    const agent = req.agent;

    try {
        // 1. Fetch all finished matches for win/loss stats
        const { data: allMatches } = await supabase
            .from('matches')
            .select('winner_id')
            .or(`player_1_id.eq.${agent.id},player_2_id.eq.${agent.id}`)
            .eq('status', 'finished');

        const totalMatches = allMatches ? allMatches.length : 0;
        const wins = allMatches ? allMatches.filter(m => m.winner_id === agent.id).length : 0;
        const losses = totalMatches - wins;

        // 2. Fetch last N matches with opponent info + final stats + ELO snapshots
        const { data: recentMatches } = await supabase
            .from('matches')
            .select(`
                id, winner_id, player_1_id, player_2_id,
                p1_final_stats, p2_final_stats,
                winner_elo_before, loser_elo_before, winner_elo_gain, loser_elo_loss,
                created_at,
                player_1:bots!matches_player_1_id_fkey(id, name),
                player_2:bots!matches_player_2_id_fkey(id, name)
            `)
            .or(`player_1_id.eq.${agent.id},player_2_id.eq.${agent.id}`)
            .eq('status', 'finished')
            .order('created_at', { ascending: false })
            .limit(RECENT_MATCH_LIMIT);

        // 3. Build latest_match string (backward compat)
        let latestMatchStatus = "No matches played yet.";
        if (recentMatches && recentMatches.length > 0) {
            const latest = recentMatches[0];
            const isWinner = latest.winner_id === agent.id;
            const opp = latest.player_1_id === agent.id ? latest.player_2 : latest.player_1;
            const oppName = (opp as any)?.name || 'Unknown';
            latestMatchStatus = isWinner
                ? `Won against ${oppName} in match ${latest.id}`
                : `Lost against ${oppName} in match ${latest.id}`;
        }

        // 4. For recent matches, fetch combat log summaries in parallel
        let detailedRecent: any[] = [];
        if (recentMatches && recentMatches.length > 0) {
            const matchIds = recentMatches.map(m => m.id);

            // Fetch all combat logs for these matches in one query
            const { data: allLogs } = await supabase
                .from('combat_logs')
                .select('match_id, actor_id, action_type, value')
                .in('match_id', matchIds);

            // Group logs by match_id
            const logsByMatch: Record<string, any[]> = {};
            if (allLogs) {
                for (const log of allLogs) {
                    if (!logsByMatch[log.match_id]) logsByMatch[log.match_id] = [];
                    logsByMatch[log.match_id].push(log);
                }
            }

            detailedRecent = recentMatches.map(match => {
                const isP1 = match.player_1_id === agent.id;
                const isWinner = match.winner_id === agent.id;
                const opp = isP1 ? match.player_2 : match.player_1;
                const myStats = isP1 ? match.p1_final_stats : match.p2_final_stats;
                const oppStats = isP1 ? match.p2_final_stats : match.p1_final_stats;

                // Calculate ELO change for this agent
                let eloChange = 0;
                if (isWinner && match.winner_elo_gain) {
                    eloChange = match.winner_elo_gain;
                } else if (!isWinner && match.loser_elo_loss) {
                    eloChange = -match.loser_elo_loss;
                }

                // Aggregate combat logs into compact summary
                const logs = logsByMatch[match.id] || [];
                const summary = buildCombatSummary(logs, agent.id, myStats, oppStats);

                return {
                    match_id: match.id,
                    result: isWinner ? 'win' : 'loss',
                    opponent: {
                        name: (opp as any)?.name || 'Unknown',
                        id: (opp as any)?.id || null
                    },
                    my_stats: myStats || null,
                    opponent_stats: oppStats || null,
                    elo_change: eloChange,
                    combat_summary: summary
                };
            });
        }

        // 5. Check for active match
        const { data: activeMatch } = await supabase
            .from('matches')
            .select('id')
            .or(`player_1_id.eq.${agent.id},player_2_id.eq.${agent.id}`)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        const currentStatus = activeMatch ? 'in_combat' : agent.status;

        res.json({
            success: true,
            agent: { id: agent.id, name: agent.name, status: currentStatus, elo: agent.elo || 1200 },
            stats: {
                total_matches: totalMatches,
                wins,
                losses,
                win_rate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) + '%' : '0%'
            },
            latest_match: latestMatchStatus,
            recent_matches: detailedRecent
        });
    } catch (err: any) {
        console.error('[Status] Error:', err.message);
        res.status(500).json({ success: false, error: "Failed to fetch agent status." });
    }
});

/**
 * Aggregates raw combat logs into a compact, token-efficient summary.
 * Instead of sending 20+ raw log lines, produces a single object
 * with key metrics an LLM agent can use to adapt strategy.
 */
function buildCombatSummary(
    logs: { actor_id: string; action_type: string; value: number }[],
    agentId: string,
    myStats: any,
    oppStats: any
): object {
    let myDamageDealt = 0;
    let myDamageTaken = 0;
    let myHeals = 0;
    let oppHeals = 0;

    for (const log of logs) {
        const isMyAction = log.actor_id === agentId;
        const isHeal = log.action_type === 'HEAL';

        if (isMyAction) {
            if (isHeal) {
                myHeals += log.value;
            } else {
                myDamageDealt += log.value;
            }
        } else {
            if (isHeal) {
                oppHeals += log.value;
            } else {
                myDamageTaken += log.value;
            }
        }
    }

    const myMaxHp = myStats?.hp || 100;
    const oppMaxHp = oppStats?.hp || 100;

    // Estimate finishing HP from damage dealt/taken/healed
    const myFinishingHp = Math.max(0, myMaxHp - myDamageTaken + myHeals);
    const oppFinishingHp = Math.max(0, oppMaxHp - myDamageDealt + oppHeals);

    return {
        total_turns: logs.length,
        my_damage_dealt: myDamageDealt,
        my_damage_taken: myDamageTaken,
        my_heals: myHeals,
        opp_damage_dealt: myDamageTaken,  // symmetric
        opp_heals: oppHeals,
        finishing_hp_pct: Math.round((myFinishingHp / myMaxHp) * 100),
        opp_finishing_hp_pct: Math.round((oppFinishingHp / oppMaxHp) * 100)
    };
}

export default router;
