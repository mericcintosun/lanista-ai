import { ethers } from 'ethers';
import { supabase } from '../lib/supabase.js';

const WATCH_REWARD_AMOUNT = 10;
const WATCH_REWARD_COOLDOWN_SEC = 2 * 60; // 2 minutes

export type SparkTransactionType =
  | 'purchase'
  | 'watch_reward'
  | string;

/**
 * Credit Spark purchase from on-chain event. Uses atomic RPC to avoid race conditions.
 * Called by Spark event listener when SparksPurchased is emitted.
 */
export async function creditSparkPurchase(
  userId: string,
  walletAddress: string,
  amount: number,
  txHash: string
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || amount <= 0) {
    return { ok: false, error: 'Invalid userId or amount' };
  }

  const { error } = await supabase.rpc('spark_credit', {
    p_user_id: userId,
    p_amount: amount,
    p_wallet_address: walletAddress,
    p_tx_type: 'purchase',
    p_reference_id: txHash
  });

  if (error) {
    console.error('[Spark] creditSparkPurchase error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Get balance for a user. Returns 0 if no row exists.
 */
export async function getBalance(userId: string): Promise<{ balance: number; wallet_address?: string | null }> {
  const { data, error } = await supabase
    .from('spark_balances')
    .select('balance, wallet_address')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Spark] getBalance error:', error.message);
    return { balance: 0 };
  }
  return {
    balance: data?.balance ?? 0,
    wallet_address: data?.wallet_address ?? null
  };
}

/**
 * Record watch reward and return new balance if cooldown passed. Caller must enforce cooldown via Redis.
 * Uses atomic RPC to avoid race with concurrent spend/credit.
 */
export async function creditWatchReward(userId: string): Promise<{ ok: boolean; amount: number; newBalance: number; error?: string }> {
  const { data: newBalance, error } = await supabase.rpc('spark_credit', {
    p_user_id: userId,
    p_amount: WATCH_REWARD_AMOUNT,
    p_wallet_address: null,
    p_tx_type: 'watch_reward',
    p_reference_id: null
  });

  if (error) {
    return { ok: false, amount: 0, newBalance: 0, error: error.message };
  }
  return { ok: true, amount: WATCH_REWARD_AMOUNT, newBalance: newBalance ?? 0 };
}

export const WELCOME_BONUS_AMOUNT = 500;

export async function creditWelcomeBonus(userId: string): Promise<void> {
  const { error } = await supabase.rpc('spark_credit', {
    p_user_id: userId,
    p_amount: WELCOME_BONUS_AMOUNT,
    p_wallet_address: null,
    p_tx_type: 'welcome_bonus',
    p_reference_id: null,
  });
  if (error) throw new Error(error.message);
  console.log(`[Spark] Welcome bonus of ${WELCOME_BONUS_AMOUNT} sparks granted to user ${userId}`);
}

export { WATCH_REWARD_AMOUNT, WATCH_REWARD_COOLDOWN_SEC };

/**
 * Spend Sparks (domates, VIP chat, prediction, etc.). Uses atomic RPC to avoid race conditions.
 */
export async function spendSpark(
  userId: string,
  amount: number,
  transactionType: string,
  referenceId: string | null
): Promise<{ ok: boolean; newBalance: number; error?: string }> {
  if (amount <= 0) {
    return { ok: false, newBalance: 0, error: 'Amount must be positive' };
  }

  const { data: newBalance, error } = await supabase.rpc('spark_spend', {
    p_user_id: userId,
    p_amount: amount,
    p_tx_type: transactionType,
    p_reference_id: referenceId
  });

  if (error) {
    const msg = error.message || '';
    const insufficient = msg.includes('insufficient_balance') || msg.toLowerCase().includes('insufficient');
    return {
      ok: false,
      newBalance: 0,
      error: insufficient ? 'Insufficient Spark balance' : msg
    };
  }
  return { ok: true, newBalance: newBalance ?? 0 };
}


// ---------------------------------------------------------------------------
// Package list for Spark store (read from chain)
// ---------------------------------------------------------------------------

const SPARK_TREASURY_ABI = [
  'function priceFeed() view returns (address)',
  'function packageCount() view returns (uint256)',
  'function packages(uint256) view returns (uint256 sparkAmount, uint256 priceUsd8)'
];

const PRICE_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
];

export interface SparkPackageInfo {
  packageId: number;
  sparkAmount: number;
  priceUsd: number;
  requiredWei: string;
  requiredAvaxFormatted: string;
}

export async function getSparkPackages(): Promise<SparkPackageInfo[]> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.SPARK_TREASURY_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress) return [];

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const treasury = new ethers.Contract(contractAddress, SPARK_TREASURY_ABI, provider);
    const priceFeedAddress = await treasury.priceFeed();
    const priceFeed = new ethers.Contract(priceFeedAddress, PRICE_FEED_ABI, provider);
    const count = Number(await treasury.packageCount());
    const [, answer] = await priceFeed.latestRoundData();
    const price8 = answer < 0 ? 0n : BigInt(answer.toString());
    if (price8 === 0n) return [];

    const out: SparkPackageInfo[] = [];
    // packageCount is set to packageId + 1 on each setPackage call, so IDs are 1-based.
    // Starting from 1 avoids a guaranteed empty RPC call for index 0.
    for (let i = 1; i < count; i++) {
      const [sparkAmount, priceUsd8] = await treasury.packages(i);
      if (sparkAmount === 0n && priceUsd8 === 0n) continue;
      const requiredWei = (priceUsd8 * BigInt(1e18)) / price8;
      out.push({
        packageId: i,
        sparkAmount: Number(sparkAmount),
        priceUsd: Number(priceUsd8) / 1e8,
        requiredWei: requiredWei.toString(),
        requiredAvaxFormatted: ethers.formatEther(requiredWei)
      });
    }
    return out;
  } catch (err: any) {
    console.error('[Spark] getSparkPackages error:', err.message);
    return [];
  }
}
