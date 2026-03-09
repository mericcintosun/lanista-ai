import { ethers } from 'ethers';
import { redis } from '../routes/shared.js';
import { creditSparkPurchase } from '../services/spark.js';

const SPARK_TREASURY_ABI = [
  'event SparksPurchased(address indexed buyer, uint256 sparkAmount, uint256 avaxPaid, uint256 ownerShare, uint256 rewardShare, string userId)'
];

const POLL_INTERVAL_MS = 15_000;
const REDIS_LAST_BLOCK_KEY = 'spark:event_listener:last_block';

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let isRunning = false;

async function getLastProcessedBlock(): Promise<number> {
  try {
    const val = await redis.get(REDIS_LAST_BLOCK_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

async function saveLastProcessedBlock(block: number): Promise<void> {
  try {
    await redis.set(REDIS_LAST_BLOCK_KEY, block.toString());
  } catch (err: any) {
    console.error('[Spark] Failed to persist last block:', err.message);
  }
}

/**
 * Process a single SparksPurchased log and credit the user.
 */
async function processLog(log: ethers.EventLog): Promise<void> {
  const [buyer, sparkAmount, , , , userId] = log.args as unknown as [string, bigint, bigint, bigint, bigint, string];
  const amount = Number(sparkAmount);
  const txHash = log.transactionHash ?? '';

  const result = await creditSparkPurchase(userId.trim(), buyer, amount, txHash);
  if (result.ok) {
    console.log(`[Spark] Credited ${amount} Sparks to user ${userId} (tx ${txHash.slice(0, 10)}...)`);
  } else {
    console.error('[Spark] creditSparkPurchase failed:', result.error);
  }
}

/**
 * Poll for new SparksPurchased events and credit spark_balances.
 * lastProcessedBlock is persisted in Redis so restarts do not re-process old events.
 * On first ever start (no Redis key), only scans the last 50 blocks as a safe bootstrap window.
 */
async function pollEvents(): Promise<void> {
  if (!contract || !provider) return;

  try {
    const currentBlock = await provider.getBlockNumber();
    const persisted = await getLastProcessedBlock();
    const fromBlock = persisted > 0 ? persisted : Math.max(0, currentBlock - 50);

    if (fromBlock > currentBlock) return;

    const filter = contract.filters.SparksPurchased();
    const logs = await contract.queryFilter(filter, fromBlock, currentBlock);

    for (const log of logs) {
      if (log instanceof ethers.EventLog) {
        await processLog(log);
      }
    }

    await saveLastProcessedBlock(currentBlock + 1);
  } catch (err: any) {
    console.error('[Spark] Poll error:', err.message);
  }
}

/**
 * Start polling for SparksPurchased events. Call once from index.ts when config is set.
 */
export function startSparkEventListener(): void {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.SPARK_TREASURY_CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    console.log('[Spark] SPARK_TREASURY_CONTRACT_ADDRESS or AVALANCHE_RPC_URL not set; Spark event listener disabled.');
    return;
  }

  if (isRunning) return;
  isRunning = true;

  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    contract = new ethers.Contract(contractAddress, SPARK_TREASURY_ABI, provider);

    const run = () => {
      pollEvents().catch(() => {});
    };

    run();
    setInterval(run, POLL_INTERVAL_MS);
    console.log('[Spark] Event poller started for SparkTreasury at', contractAddress, '(interval', POLL_INTERVAL_MS, 'ms)');
  } catch (err: any) {
    console.error('[Spark] Failed to start event listener:', err.message);
    isRunning = false;
  }
}
