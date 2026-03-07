import { Worker } from 'bullmq';
import { supabase } from '../lib/supabase.js';
import { signCombatProof } from '../services/webhook.js';
import { evaluateStrategy, resolveAction, DEFAULT_STRATEGY } from './strategy.js';
import type { Strategy, GameState } from './strategy.js';
import { calculateElo } from '../services/elo.js';
import { getRankIndex } from '../lib/rank.js';
import Redis from 'ioredis';

// Use REDIS_URL directly if provided, important for BullMQ
export const connection: any = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
    host: '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null
  });

// Dedicated client for manual signaling/polling to avoid blocking main worker connection
const signalClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({ host: '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') });

// Allow multiple matches to be processed concurrently for true \"live\" behavior.
// Configurable via MATCH_WORKER_CONCURRENCY env; defaults to 5.
const WORKER_CONCURRENCY = parseInt(process.env.MATCH_WORKER_CONCURRENCY || '5', 10);

export const matchWorker = new Worker('match-queue', async (job) => {
  const { matchId, p1, p2 } = job.data;

  // Load strategies (submitted during prepare-combat, or use defaults)
  const p1Strategy: Strategy = p1.strategy || DEFAULT_STRATEGY;
  const p2Strategy: Strategy = p2.strategy || DEFAULT_STRATEGY;

  let p1_hp = p1.hp;
  let p2_hp = p2.hp;
  const p1_max_hp = p1.hp;
  const p2_max_hp = p2.hp;

  // In-memory combat log accumulator — hashed at end for on-chain proof
  const allCombatLogs: object[] = [];

  // Track vulnerability from HEAVY_ATTACK
  let p1_vulnerable = false;
  let p2_vulnerable = false;

  console.log(`[Worker] Match ${matchId}: ${p1.name} vs ${p2.name}`);

  let currentTurn = 1;
  let isP1Turn = Math.random() > 0.5;

  try {
    if (process.env.SUPABASE_URL) {
      await supabase.from('matches').update({
        p1_current_hp: p1.hp,
        p2_current_hp: p2.hp,
        current_turn: 0
      }).eq('id', matchId);
    }
  } catch (err) {
    console.error('[Worker] Initial state update error', err);
  }

  // ── Viewer-ready gate ──────────────────────────────────────────────────
  // Wait for a viewer (Unity) to signal readiness before starting combat.
  // This prevents the match from running while WebGL is still loading.
  // Max wait: 25 seconds — if no viewer connects, start anyway.
  const VIEWER_READY_KEY = `match:${matchId}:viewer-ready`;
  const MAX_WAIT_MS = 25_000;
  const POLL_INTERVAL_MS = 100; // Faster polling for tighter sync

  const startWait = Date.now();
  let viewerReady = false;

  console.log(`[Worker] Match ${matchId}: Waiting for viewer-ready signal (max ${MAX_WAIT_MS / 1000}s)...`);

  while (Date.now() - startWait < MAX_WAIT_MS) {
    const signal = await signalClient.get(VIEWER_READY_KEY);
    if (signal) {
      viewerReady = true;
      break;
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  // Clean up the Redis key
  await signalClient.del(VIEWER_READY_KEY).catch(() => {});

  if (viewerReady) {
    console.log(`[Worker] Match ${matchId}: Viewer ready! Starting combat.`);
  } else {
    console.log(`[Worker] Match ${matchId}: No viewer after ${MAX_WAIT_MS / 1000}s — starting anyway.`);
  }

  // Combat Loop — fully automatic, no waiting
  while (p1_hp > 0 && p2_hp > 0) {
    const activeAgent = isP1Turn ? p1 : p2;
    const targetAgent = isP1Turn ? p2 : p1;
    const activeStrategy = isP1Turn ? p1Strategy : p2Strategy;
    const activeHp = isP1Turn ? p1_hp : p2_hp;
    const activeMaxHp = isP1Turn ? p1_max_hp : p2_max_hp;
    const targetHp = isP1Turn ? p2_hp : p1_hp;
    const isVulnerable = isP1Turn ? p1_vulnerable : p2_vulnerable;

    // Build game state for strategy evaluation
    const state: GameState = {
      my_hp: activeHp,
      my_max_hp: activeMaxHp,
      opp_hp: targetHp,
      my_atk: activeAgent.attack,
      my_def: activeAgent.defense,
      turn: currentTurn
    };

    // Evaluate strategy — weighted random based on HP bracket
    const chosenAction = evaluateStrategy(activeStrategy, state);

    // Resolve the action
    const result = resolveAction(
      chosenAction,
      { name: activeAgent.name, attack: activeAgent.attack, defense: activeAgent.defense, hp: activeHp, max_hp: activeMaxHp },
      { defense: targetAgent.defense, hp: targetHp }
    );

    // Apply vulnerability modifier (from previous HEAVY_ATTACK by opponent)
    let actualDamage = result.damage;
    if (isVulnerable && result.damage > 0) {
      // This agent is vulnerable — they don't deal extra, they TAKE extra
      // (vulnerability is applied when they get HIT, not when they attack)
    }

    // Apply damage to target (with vulnerability check on TARGET)
    const targetVulnerable = isP1Turn ? p2_vulnerable : p1_vulnerable;
    if (targetVulnerable && actualDamage > 0) {
      actualDamage = Math.floor(actualDamage * 1.3);
    }

    if (actualDamage > 0) {
      if (isP1Turn) p2_hp -= actualDamage;
      else p1_hp -= actualDamage;
    }

    // Apply healing
    if (result.healing > 0) {
      if (isP1Turn) p1_hp = Math.min(p1_max_hp, p1_hp + result.healing);
      else p2_hp = Math.min(p2_max_hp, p2_hp + result.healing);
    }

    // Update vulnerability state
    if (isP1Turn) {
      p1_vulnerable = result.vulnerable;
    } else {
      p2_vulnerable = result.vulnerable;
    }

    // Build narrative (include vulnerability bonus info)
    let narrative = result.narrative;
    if (targetVulnerable && actualDamage > result.damage) {
      narrative += ` (🔥 +30% vulnerability bonus!)`;
    }

    const target_current_hp = isP1Turn ? Math.max(0, p2_hp) : Math.max(0, p1_hp);
    const action_type = target_current_hp <= 0 ? 'CRITICAL' : chosenAction;

    console.log(`[Turn ${currentTurn}] ${narrative} (Target HP: ${target_current_hp})`);

    // Log to Supabase + accumulate for on-chain hash
    const logEntry = {
      match_id: matchId,
      actor_id: activeAgent.id,
      action_type: action_type,
      value: actualDamage || result.healing,
      narrative,
      target_current_hp,
      turn: currentTurn
    };
    allCombatLogs.push(logEntry);

    try {
      if (process.env.SUPABASE_URL) {
        await supabase.from('combat_logs').insert({
          match_id: matchId,
          actor_id: activeAgent.id,
          action_type: action_type,
          value: actualDamage || result.healing,
          narrative,
          target_current_hp
        });

        await supabase.from('matches').update({
          p1_current_hp: Math.max(0, p1_hp),
          p2_current_hp: Math.max(0, p2_hp),
          current_turn: currentTurn
        }).eq('id', matchId);
      }
    } catch (err) {
      console.error('[Worker] Supabase log error', err);
    }

    // Switch turn
    isP1Turn = !isP1Turn;
    currentTurn++;

    // Synthetic delay for live viewing (Longer for first turn to allow Unity intros)
    // Note: currentTurn has been incremented, so turn 1 finish check is currentTurn === 2
    const turnDelay = currentTurn === 2 ? 4000 : 2500;
    await new Promise(r => setTimeout(r, turnDelay));

    if (p1_hp <= 0 || p2_hp <= 0) break;
  }

  const winnerId = p1_hp > 0 ? p1.id : p2.id;
  const loserId = p1_hp > 0 ? p2.id : p1.id;

  // 1. ELO update — independent of blockchain, do first
  let winnerEloBefore = 1200;
  let loserEloBefore = 1200;
  let winnerEloGain = 0;
  let loserEloLoss = 0;
  let winnerRankedUp = false;
  let winnerNewRankIndex = 0;

  try {
    if (process.env.SUPABASE_URL) {
      const [{ data: winnerData }, { data: loserData }] = await Promise.all([
        supabase.from('bots').select('elo, total_matches').eq('id', winnerId).single(),
        supabase.from('bots').select('elo, total_matches').eq('id', loserId).single()
      ]);

      winnerEloBefore = winnerData?.elo ?? 0;
      loserEloBefore = loserData?.elo ?? 0;

      const eloResult = calculateElo(
        winnerEloBefore,
        loserEloBefore,
        winnerData?.total_matches ?? 0,
        loserData?.total_matches ?? 0
      );

      winnerEloGain = eloResult.winnerGain;
      loserEloLoss = eloResult.loserLoss;

      const winnerOldRankIndex = getRankIndex(winnerEloBefore, (winnerData?.total_matches ?? 0) > 0);
      winnerNewRankIndex = getRankIndex(eloResult.newWinnerElo, true);
      winnerRankedUp = winnerNewRankIndex > winnerOldRankIndex;

      await Promise.all([
        supabase.from('bots').update({
          elo: eloResult.newWinnerElo,
          total_matches: (winnerData?.total_matches ?? 0) + 1
        }).eq('id', winnerId),
        supabase.from('bots').update({
          elo: eloResult.newLoserElo,
          total_matches: (loserData?.total_matches ?? 0) + 1
        }).eq('id', loserId)
      ]);

      console.log(`[ELO] Winner ${winnerId}: ${winnerEloBefore} → ${eloResult.newWinnerElo} (+${winnerEloGain})`);
      console.log(`[ELO] Loser  ${loserId}: ${loserEloBefore} → ${eloResult.newLoserElo} (-${loserEloLoss})`);
      if (winnerRankedUp) console.log(`[ELO] Winner ranked up to index ${winnerNewRankIndex}`);
    }
  } catch (err) {
    console.error('[Worker] ELO update error:', err);
  }

  // 2. Write match result to DB (with off-chain proof + ELO snapshot)
  try {
    const proof = await signCombatProof(matchId, winnerId, loserId);
    if (process.env.SUPABASE_URL) {
      await supabase.from('matches').update({
        status: 'finished',
        winner_id: winnerId,
        tx_hash: JSON.stringify(proof),
        winner_elo_before: winnerEloBefore,
        loser_elo_before: loserEloBefore,
        winner_elo_gain: winnerEloGain,
        loser_elo_loss: loserEloLoss
      }).eq('id', matchId);

      // Reset bot statuses back to active so they can compete again
      await supabase.from('bots').update({ status: 'active' }).in('id', [winnerId, loserId]);

      console.log(`[Worker] Match ${matchId} finished. Winner: ${winnerId}`);
    }
  } catch (err) {
    console.error('[Worker] Finalize DB error:', err);
    // Continue even on DB error — blockchain job should still be queued
    try {
      await supabase.from('matches').update({
        status: 'finished',
        winner_id: winnerId
      }).eq('id', matchId);
    } catch { /* swallow */ }
  }

  // 3. Blockchain job — always runs, independent of DB errors
  try {
    if (process.env.SUPABASE_URL) {
      const [{ data: winnerBot }, { data: loserBot }] = await Promise.all([
        supabase.from('bots').select('wallet_address').eq('id', winnerId).single(),
        supabase.from('bots').select('wallet_address').eq('id', loserId).single()
      ]);

      // Lazy import to avoid circular dependency
      const { blockchainQueue } = await import('./blockchain-worker.js');
      await blockchainQueue.add('on-chain-record', {
        matchId,
        winnerId,
        loserId,
        winnerWallet: winnerBot?.wallet_address || null,
        loserWallet: loserBot?.wallet_address || null,
        combatLogs: allCombatLogs,
        winnerRankedUp,
        winnerNewRankIndex
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
      console.log(`[Worker] Blockchain job queued for match ${matchId}`);
    } else {
      console.log(`[Worker] Match ${matchId} finished (Dry Run). Winner: ${winnerId}`);
    }
  } catch (err) {
    console.error('[Worker] Blockchain queue error:', err);
  }

  return { winnerId };

}, { connection, concurrency: WORKER_CONCURRENCY });

matchWorker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

matchWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed: ${err.message}`);
});
