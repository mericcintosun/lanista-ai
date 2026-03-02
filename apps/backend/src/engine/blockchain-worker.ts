import { Worker, Queue } from 'bullmq';
import { supabase } from '../lib/supabase.js';
import { recordMatchOnChain, computeCombatLogHash } from '../services/oracle.js';
import { requestLootForWinner } from '../services/loot.js';
import { connection } from './match-worker.js';

// Queue tanımı — match-worker'dan job eklemek için export ediliyor
export const blockchainQueue = new Queue('blockchain-queue', { connection });

/**
 * Blockchain Worker — concurrency=1
 * 
 * Tüm on-chain işlemler (Oracle kayıt + Loot isteği) bu worker üzerinden
 * sıralı olarak çalışır. Böylece aynı deployer wallet'tan gönderilen
 * transaction'lar nonce çakışmasına neden olmaz.
 * 
 * Match worker maçı bitirir → blockchain-queue'ya job ekler → bu worker sırayla işler.
 */
const blockchainWorker = new Worker('blockchain-queue', async (job) => {
    const { matchId, winnerId, loserId, winnerWallet, loserWallet, combatLogs } = job.data;

    console.log(`[Blockchain] 🔗 Processing on-chain ops for match ${matchId}`);

    // 1. Combat log hash
    const combatLogHash = combatLogs && combatLogs.length > 0
        ? computeCombatLogHash(combatLogs)
        : '0x0000000000000000000000000000000000000000000000000000000000000000';

    console.log(`[Blockchain] 📋 ${combatLogs?.length || 0} tur logu hash'lendi.`);

    // 2. Oracle — on-chain kayıt
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

}, { connection, concurrency: 1, lockDuration: 120000 }); // concurrency=1 → nonce çakışması olmaz, lockDuration=120s → blockchain tx onay bekleme süresi

blockchainWorker.on('completed', (job) => {
    console.log(`[Blockchain] ✅ Job ${job.id} completed (match: ${job.data.matchId})`);
});

blockchainWorker.on('failed', (job, err) => {
    console.error(`[Blockchain] ❌ Job ${job?.id} failed: ${err.message}`);
});

export { blockchainWorker };
