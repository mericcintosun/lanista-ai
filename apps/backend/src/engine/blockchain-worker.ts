import { ethers } from 'ethers';
import { Worker, Queue } from 'bullmq';
import { supabase } from '../lib/supabase.js';
import { recordMatchOnChain, computeCombatLogHash } from '../services/oracle.js';
import { requestRankUpLoot } from '../services/rankUpLoot.js';
import { updateReputationOnChain, mintPassport } from '../services/passport.js';
import { connection } from './match-worker.js';

// Queue definition — exported so match-worker and register can add jobs
export const blockchainQueue = new Queue('blockchain-queue', { connection });

function normalizeWallet(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return ethers.getAddress(trimmed);
  } catch {
    return null;
  }
}

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
    if (job.name === 'mint-passport') {
        const { botWallet, ownerWallet, metadataURI } = job.data;
        const winner = normalizeWallet(botWallet);
        if (!winner) {
            console.warn('[Blockchain] ⚠️ mint-passport: invalid botWallet');
            return { tokenId: null };
        }
        const result = await mintPassport(winner, ownerWallet || null, metadataURI || '');
        if (result) console.log(`[Blockchain] 🛂 Passport minted for ${winner}, tokenId=${result.tokenId}`);
        return result || { tokenId: null };
    }

    const {
      matchId, winnerId, loserId, winnerWallet, loserWallet, combatLogs,
      winnerRankedUp, winnerNewRankIndex,
      winnerReputation, loserReputation, winnerWins, loserWins, winnerTotalMatches, loserTotalMatches
    } = job.data;

    const winner = normalizeWallet(winnerWallet);
    const loser = normalizeWallet(loserWallet);

    console.log(`[Blockchain] 🔗 Processing on-chain ops for match ${matchId}`);

    // 1. Combat log hash
    const combatLogHash = combatLogs && combatLogs.length > 0
        ? computeCombatLogHash(combatLogs)
        : '0x0000000000000000000000000000000000000000000000000000000000000000';

    console.log(`[Blockchain] 📋 ${combatLogs?.length || 0} turn logs hashed.`);

    // 2. Oracle — on-chain recording (every finished match when we have valid wallets)
    let txHash: string | null = null;
    if (winner && loser) {
        txHash = await recordMatchOnChain(matchId, winner, loser, combatLogHash);
        if (txHash) {
            const { error } = await supabase.from('matches').update({ tx_hash: txHash }).eq('id', matchId);
            if (error) {
                console.error(`[Blockchain] Failed to update tx_hash for ${matchId}:`, error.message);
                const { error: retryError } = await supabase.from('matches').update({ tx_hash: txHash }).eq('id', matchId);
                if (retryError) console.error(`[Blockchain] Retry failed:`, retryError.message);
            }
        }

        // 3. Rank-up loot — Chainlink VRF NFT only when winner ranked up; once per bot per rank
        console.log(`[Blockchain] winnerRankedUp=${winnerRankedUp} winnerNewRankIndex=${winnerNewRankIndex} winnerId=${winnerId}`);
        if (winnerRankedUp && typeof winnerNewRankIndex === 'number' && winnerId) {
            const { data: existing } = await supabase
                .from('rank_up_loot_requests')
                .select('id')
                .eq('bot_id', winnerId)
                .eq('new_rank_index', winnerNewRankIndex)
                .maybeSingle();
            if (existing) {
                console.log(`[Blockchain] ⏭️ Rank-up loot already requested for bot ${winnerId} rank ${winnerNewRankIndex}, skipping`);
            } else {
                const result = await requestRankUpLoot(winner, winnerNewRankIndex);
                if (result) {
                    console.log(`[Blockchain] 🎁 Rank-up loot requested for ${winner}, requestId=${result.requestId}`);
                    try {
                        await supabase.from('rank_up_loot_requests').insert({
                            bot_id: winnerId,
                            request_id: result.requestId,
                            wallet_address: winner,
                            new_rank_index: winnerNewRankIndex,
                            match_id: matchId
                        });
                    } catch (e) {
                        console.warn('[Blockchain] Could not insert rank_up_loot_requests:', (e as Error)?.message);
                    }
                }
            }
        }

        // 4. ERC-8004 Passport — update reputation on chain for winner and loser
        if (typeof winnerReputation === 'number' && typeof loserReputation === 'number' &&
            typeof winnerWins === 'number' && typeof loserWins === 'number' &&
            typeof winnerTotalMatches === 'number' && typeof loserTotalMatches === 'number') {
            const [winnerUpdated, loserUpdated] = await Promise.all([
                updateReputationOnChain(winner, winnerReputation, winnerTotalMatches, winnerWins),
                updateReputationOnChain(loser, loserReputation, loserTotalMatches, loserWins)
            ]);
            if (winnerUpdated) console.log(`[Blockchain] 🛂 Passport reputation updated for winner ${winner}`);
            if (loserUpdated) console.log(`[Blockchain] 🛂 Passport reputation updated for loser ${loser}`);
        }
    } else {
        console.warn(`[Blockchain] ⚠️ Wallet addresses missing or invalid for match ${matchId} (winner=${Boolean(winner)}, loser=${Boolean(loser)}). Oracle not called.`);
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
