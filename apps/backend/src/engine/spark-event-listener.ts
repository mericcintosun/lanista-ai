import { ethers } from 'ethers';
import { creditSparkPurchase } from '../services/spark.js';

const SPARK_TREASURY_ABI = [
  'event SparksPurchased(address indexed buyer, uint256 sparkAmount, uint256 avaxPaid, string userId)'
];

const POLL_INTERVAL_MS = 15_000;
let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let lastProcessedBlock = 0;
let isRunning = false;

/**
 * Process a single SparksPurchased log and credit the user.
 */
async function processLog(log: ethers.EventLog): Promise<void> {
  const [buyer, sparkAmount, avaxPaid, userId] = log.args as unknown as [string, bigint, bigint, string];
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
 * Uses block range to avoid missing events; stores last processed block in memory.
 */
async function pollEvents(): Promise<void> {
  if (!contract || !provider) return;

  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = lastProcessedBlock || Math.max(0, currentBlock - 1000);

    if (fromBlock > currentBlock) return;

    const filter = contract.filters.SparksPurchased();
    const logs = await contract.queryFilter(filter, fromBlock, currentBlock);

    for (const log of logs) {
      if (log instanceof ethers.EventLog) {
        await processLog(log);
      }
    }

    lastProcessedBlock = currentBlock + 1;
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
