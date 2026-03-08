import { ethers } from 'ethers';
import { supabase } from '../lib/supabase.js';

/**
 * 1 Spark = $0.005 (package config: 1000 Sparks = $5, priceUsd8 = 5e8)
 * Represented with 8 decimal places: 5e8 / 1000 = 5e5
 */
const SPARK_PRICE_USD8 = 5n * 10n ** 5n;

/**
 * Minimum accumulated reward before an automatic on-chain distribution fires.
 * 0.01 AVAX = 10^16 wei
 */
const THRESHOLD_WEI = 10n ** 16n;

const PRICE_FEED_ABI = [
  'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
];

async function getAvaxPrice8(): Promise<bigint | null> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const feedAddr = process.env.AVAX_USD_PRICE_FEED_FUJI || '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD';
  if (!rpcUrl) return null;
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feed = new ethers.Contract(feedAddr, PRICE_FEED_ABI, provider);
    const [, answer] = await feed.latestRoundData();
    const p = BigInt(answer.toString());
    return p > 0n ? p : null;
  } catch (e: any) {
    console.error('[BotReward] Chainlink fetch error:', e.message);
    return null;
  }
}

function sparksToWei(sparks: number, price8: bigint): bigint {
  return (BigInt(sparks) * SPARK_PRICE_USD8 * 10n ** 18n) / price8;
}

async function sendOnChain(
  toAddress: string,
  amountWei: bigint
): Promise<{ txHash: string } | { error: string }> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL!;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayer = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(relayer.address);
    if (balance < amountWei) {
      return { error: `Relayer balance insufficient (have ${ethers.formatEther(balance)} AVAX, need ${ethers.formatEther(amountWei)} AVAX)` };
    }
    const tx = await relayer.sendTransaction({ to: toAddress, value: amountWei });
    await tx.wait();
    return { txHash: tx.hash };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Accumulates the Spark-equivalent AVAX reward for each of the user's bots in the DB.
 * If any bot's pending total reaches THRESHOLD_WEI (0.01 AVAX), it triggers an
 * automatic on-chain distribution for that bot only.
 *
 * Fire-and-forget — never throws, never blocks the spend response.
 */
export async function distributeBotRewards(userId: string, spentSparks: number): Promise<void> {
  if (!process.env.AVALANCHE_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY) {
    console.warn('[BotReward] Missing env — skipping.');
    return;
  }
  try {
    const [price8, { data: bots }] = await Promise.all([
      getAvaxPrice8(),
      supabase
        .from('bots')
        .select('id, wallet_address, pending_reward_wei')
        .eq('owner_id', userId)
        .not('wallet_address', 'is', null),
    ]);

    if (!price8 || !bots?.length) return;

    const totalWei = sparksToWei(spentSparks, price8);
    if (totalWei <= 0n) return;

    const perBotWei = totalWei / BigInt(bots.length);
    if (perBotWei <= 0n) return;

    for (const bot of bots) {
      const currentPending = BigInt(bot.pending_reward_wei ?? '0');
      const newPending = currentPending + perBotWei;

      if (newPending >= THRESHOLD_WEI) {
        // Attempt on-chain distribution before writing to DB
        const result = await sendOnChain(bot.wallet_address, newPending);
        if ('txHash' in result) {
          console.log(`[BotReward] ✅ Auto-distributed ${ethers.formatEther(newPending)} AVAX to bot ${bot.id} — tx ${result.txHash}`);
          await supabase.from('bots').update({ pending_reward_wei: 0 }).eq('id', bot.id);
        } else {
          // On-chain failed: still accumulate so the owner can claim manually
          console.warn(`[BotReward] On-chain failed for bot ${bot.id}: ${result.error}. Accumulating anyway.`);
          await supabase.from('bots').update({ pending_reward_wei: newPending.toString() }).eq('id', bot.id);
        }
      } else {
        await supabase.from('bots').update({ pending_reward_wei: newPending.toString() }).eq('id', bot.id);
      }
    }
  } catch (e: any) {
    console.error('[BotReward] Unexpected error:', e.message);
  }
}

/**
 * Manually claims all pending AVAX reward for a single bot.
 * Called by the owner via POST /api/bots/:id/claim-reward.
 */
export async function claimBotReward(
  botId: string,
  ownerId: string
): Promise<{ ok: true; txHash: string; amountAvax: string } | { ok: false; error: string }> {
  if (!process.env.AVALANCHE_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY) {
    return { ok: false, error: 'Blockchain not configured.' };
  }

  const { data: bot, error: fetchErr } = await supabase
    .from('bots')
    .select('id, wallet_address, pending_reward_wei, owner_id')
    .eq('id', botId)
    .single();

  if (fetchErr || !bot) return { ok: false, error: 'Bot not found.' };
  if (bot.owner_id !== ownerId) return { ok: false, error: 'Not the owner of this bot.' };
  if (!bot.wallet_address) return { ok: false, error: 'Bot has no wallet address.' };

  const pendingWei = BigInt(bot.pending_reward_wei ?? '0');
  if (pendingWei <= 0n) return { ok: false, error: 'No pending reward to claim.' };

  const result = await sendOnChain(bot.wallet_address, pendingWei);
  if ('error' in result) return { ok: false, error: result.error };

  await supabase.from('bots').update({ pending_reward_wei: 0 }).eq('id', botId);

  return {
    ok: true,
    txHash: result.txHash,
    amountAvax: ethers.formatEther(pendingWei),
  };
}
