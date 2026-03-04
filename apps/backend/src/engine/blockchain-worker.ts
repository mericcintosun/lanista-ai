import { Worker, Queue } from 'bullmq';
import { supabase } from '../lib/supabase.js';
import { recordMatchOnChain, computeCombatLogHash } from '../services/oracle.js';
import { requestLootForWinner } from '../services/loot.js';
import { connection } from './match-worker.js';

// Queue definition — exported so match-worker can add jobs
export const blockchainQueue = new Queue('blockchain-queue', { connection });

/**
 * Blockchain Worker — concurrency=1
 * 
 * All on-chain operations (Oracle recording + Loot request) run sequentially
 * through this worker. This prevents nonce conflicts for transactions
 * sent from the same deployer wallet.
 * 
 * Match worker finishes a match → adds job to blockchain-queue → this worker processes sequentially.
 */
const blockchainWorker = new Worker('blockchain-queue', async (job) => {
    const { matchId, winnerId, loserId, winnerWallet, loserWallet, combatLogs } = job.data;

    console.log(`[Blockchain] 🔗 Processing on-chain ops for match ${matchId}`);

    // 1. Combat log hash
    const combatLogHash = combatLogs && combatLogs.length > 0
        ? computeCombatLogHash(combatLogs)
        : '0x0000000000000000000000000000000000000000000000000000000000000000';

    console.log(`[Blockchain] 📋 ${combatLogs?.length || 0} turn logs hashed.`);

    // 2. Oracle — on-chain recording
    let txHash: string | null = null;
    if (winnerWallet && loserWallet) {
        txHash = await recordMatchOnChain(matchId, winnerWallet, loserWallet, combatLogHash);
        if (txHash) {
            await supabase.from('matches').update({ tx_hash: txHash }).eq('id', matchId);
        }

        // 3. Loot — Chainlink VRF
        await requestLootForWinner(matchId, winnerWallet);
    } else {
        console.warn(`[Blockchain] ⚠️ Wallet addresses missing for match ${matchId}, skipping.`);
    }

    return { matchId, txHash };

}, { connection, concurrency: 1, lockDuration: 120000 }); // concurrency=1 → no nonce conflicts, lockDuration=120s → blockchain tx confirmation wait time

blockchainWorker.on('completed', (job) => {
    console.log(`[Blockchain] ✅ Job ${job.id} completed (match: ${job.data.matchId})`);
});

blockchainWorker.on('failed', (job, err) => {
    console.error(`[Blockchain] ❌ Job ${job?.id} failed: ${err.message}`);
});

export { blockchainWorker };
