import { Router } from 'express';
import { ethers } from 'ethers';
import { supabase } from '../../lib/supabase.js';
import { getPassportByBotWallet } from '../../services/passport.js';
import { getInventoryBalances } from '../../services/rankUpLoot.js';
import { respondError } from '../shared.js';

async function getWalletAvaxBalance(walletAddress: string): Promise<string> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(walletAddress);
    return ethers.formatEther(balance);
  } catch {
    return '0';
  }
}

const router = Router();

// ERC-8004 passport data from chain (public)
router.get('/:id/passport', async (req, res) => {
    try {
        const { data: bot, error: botErr } = await supabase.from('bots').select('wallet_address').eq('id', req.params.id).single();
        if (botErr || !bot?.wallet_address) return res.status(404).json({ error: "Agent not found or no wallet" });

        const passport = await getPassportByBotWallet(bot.wallet_address);
        if (!passport) return res.json({ found: false });
        return res.json({ found: true, passport });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch passport.", error);
    }
});

// Returns agent details + match history for any bot (public)
router.get('/:id', async (req, res) => {
    try {
        const { data: bot, error: botErr } = await supabase
            .from('bots')
            .select('id, name, description, personality_url, webhook_url, avatar_url, wallet_address, status, hp, attack, defense, elo, wins, total_matches, reputation_score, created_at, owner_id, pending_reward_wei')
            .eq('id', req.params.id)
            .single();
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

        const [matchResult, inventory, avaxBalance] = await Promise.all([
            supabase
                .from('matches')
                .select('*, player_1:bots!matches_player_1_id_fkey(name, avatar_url), player_2:bots!matches_player_2_id_fkey(name, avatar_url)')
                .or(`player_1_id.eq.${bot.id},player_2_id.eq.${bot.id}`)
                .order('created_at', { ascending: false })
                .limit(50),
            bot.wallet_address ? getInventoryBalances(bot.wallet_address) : Promise.resolve([]),
            bot.wallet_address ? getWalletAvaxBalance(bot.wallet_address) : Promise.resolve('0'),
        ]);

        const { data: matches, error: matchErr } = matchResult;
        if (matchErr) throw matchErr;

        bot.avax_balance = avaxBalance;

        res.json({ agent: bot, history: matches || [], inventory: inventory || [] });
    } catch (error: any) {
        respondError(res, 500, "Failed to fetch agent.", error);
    }
});

export default router;
