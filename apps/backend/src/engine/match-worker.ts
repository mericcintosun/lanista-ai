import { Worker } from 'bullmq';
import { supabase } from '../lib/supabase.js';
import { signCombatProof } from '../services/webhook.js';
import { recordMatchOnChain } from '../services/oracle.js';
import { evaluateStrategy, resolveAction, DEFAULT_STRATEGY } from './strategy.js';
import type { Strategy, GameState } from './strategy.js';

import Redis from 'ioredis';

// Use REDIS_URL directly if provided, important for BullMQ
export const connection: any = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
    host: '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null
  });

export const matchWorker = new Worker('match-queue', async (job) => {
  const { matchId, p1, p2 } = job.data;

  // Load strategies (submitted during prepare-combat, or use defaults)
  const p1Strategy: Strategy = p1.strategy || DEFAULT_STRATEGY;
  const p2Strategy: Strategy = p2.strategy || DEFAULT_STRATEGY;

  let p1_hp = p1.hp;
  let p2_hp = p2.hp;
  const p1_max_hp = p1.hp;
  const p2_max_hp = p2.hp;

  // Track vulnerability from HEAVY_ATTACK
  let p1_vulnerable = false;
  let p2_vulnerable = false;

  console.log(`[Worker] Match ${matchId}: ${p1.name} vs ${p2.name}`);

  let currentTurn = 1;
  let isP1Turn = Math.random() > 0.5;

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

    // Log to Supabase
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
      }
    } catch (err) {
      console.error('[Worker] Supabase log error', err);
    }

    // Switch turn
    isP1Turn = !isP1Turn;
    currentTurn++;

    // Synthetic delay for live viewing
    await new Promise(r => setTimeout(r, 1000));

    if (p1_hp <= 0 || p2_hp <= 0) break;
  }

  const winnerId = p1_hp > 0 ? p1.id : p2.id;
  const loserId = p1_hp > 0 ? p2.id : p1.id;

  try {
    const proof = await signCombatProof(matchId, winnerId, loserId);

    if (process.env.SUPABASE_URL) {
      await supabase.from('matches').update({
        status: 'finished',
        winner_id: winnerId,
        tx_hash: JSON.stringify(proof)
      }).eq('id', matchId);
      console.log(`[Worker] Match ${matchId} finished. Winner: ${winnerId}`);

      // --- 🔗 AVALANCHE ON-CHAIN KAYIT ---
      const [{ data: winnerBot }, { data: loserBot }] = await Promise.all([
        supabase.from('bots').select('wallet_address').eq('id', winnerId).single(),
        supabase.from('bots').select('wallet_address').eq('id', loserId).single()
      ]);

      if (winnerBot?.wallet_address && loserBot?.wallet_address) {
        const txHash = await recordMatchOnChain(
          matchId,
          winnerBot.wallet_address,
          loserBot.wallet_address
        );
        if (txHash) {
          await supabase.from('matches').update({ tx_hash: txHash }).eq('id', matchId);
        }
      } else {
        console.warn(`[Oracle] ⚠️  Wallet addresses missing, skipping on-chain record.`);
      }
    } else {
      console.log(`[Worker] Match ${matchId} finished (Dry Run). Winner: ${winnerId}`);
    }
  } catch (err) {
    console.error('[Worker] Finalize error:', err);
  }

  return { winnerId };

}, { connection });

matchWorker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

matchWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed: ${err.message}`);
});
