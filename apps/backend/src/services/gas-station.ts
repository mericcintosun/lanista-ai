import type { Request, Response } from 'express';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase.js';
import { getLootForMatch } from './loot.js';

// 0.005 AVAX — More than enough to cover a single claim transaction
const GAS_SPONSOR_AMOUNT = ethers.parseUnits('0.005', 'ether');

/**
 * Just-In-Time (JIT) Gas Station
 * Provides micro gas (AVAX) sponsorship from the platform so that
 * bots can execute transactions with their own wallets.
 */
export async function sponsorGas(req: Request, res: Response) {
  const { botId, matchId } = req.body;

  if (!botId || !matchId) {
    return res.status(400).json({ error: "Missing botId or matchId in request body." });
  }

  try {
    // 1. SECURITY (On-Chain + DB Check): Did the bot actually win and hasn't claimed yet?

    // On-chain verification
    const loot = await getLootForMatch(matchId);
    if (!loot || !loot.fulfilled) {
      return res.status(404).json({ error: 'Loot record not found or not yet fulfilled on-chain.' });
    }

    if (loot.claimed) {
      return res.status(403).json({ error: 'Loot already claimed on-chain. Gas sponsorship rejected.' });
    }

    // Winner verification on DB side
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('winner_id')
      .eq('id', matchId)
      .single();

    if (matchErr || !match) {
      return res.status(404).json({ error: 'Match record not found in database.' });
    }

    if (match.winner_id !== botId) {
      return res.status(403).json({ error: 'Bot ID mismatch. This bot is not the recorded winner.' });
    }

    // 2. Fetch the bot's wallet address
    const { data: bot, error: botErr } = await supabase
      .from('bots')
      .select('wallet_address')
      .eq('id', botId)
      .single();

    if (botErr || !bot?.wallet_address) {
      return res.status(404).json({ error: 'Agent wallet address not found.' });
    }

    // On-chain winner address check
    if (loot.winner.toLowerCase() !== bot.wallet_address.toLowerCase()) {
      return res.status(403).json({ error: 'On-chain winner address does not match bot wallet address.' });
    }

    const rpcUrl = process.env.AVALANCHE_RPC_URL!;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 3. Current balance check (prevent unnecessary funding)
    const currentBalance = await provider.getBalance(bot.wallet_address);
    if (currentBalance >= GAS_SPONSOR_AMOUNT) {
      return res.status(200).json({
        message: 'Bot has sufficient gas balance.',
        sponsored: false,
        address: bot.wallet_address,
        balance: ethers.formatEther(currentBalance)
      });
    }

    // 4. Send gas from the platform wallet (Relayer) to the bot
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
    if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY is not configured.");

    const relayerWallet = new ethers.Wallet(privateKey, provider);

    console.log(`[GasStation] ⛽ Sponsoring gas for Bot ${botId} (${bot.wallet_address}) for match ${matchId}...`);

    const tx = await relayerWallet.sendTransaction({
      to: bot.wallet_address,
      value: GAS_SPONSOR_AMOUNT
    });

    console.log(`[GasStation] ⏳ Gas TX broadcasted: ${tx.hash}`);
    await tx.wait();
    console.log(`[GasStation] ✅ Gas sponsored successfully!`);

    return res.status(200).json({
      message: 'Gas sponsored successfully.',
      sponsored: true,
      txHash: tx.hash,
      amount: ethers.formatEther(GAS_SPONSOR_AMOUNT)
    });

  } catch (error: any) {
    console.error('[GasStation] ❌ Error:', error.message);
    return res.status(500).json({ error: 'Failed to sponsor gas. Check server logs.' });
  }
}
