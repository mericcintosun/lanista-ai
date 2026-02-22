import { Worker } from 'bullmq';
import { supabase } from '../lib/supabase.js';

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
  
  let p1_hp = p1.hp;
  let p2_hp = p2.hp;

  console.log(`[Worker] Starting Match ${matchId} between ${p1.name} and ${p2.name}`);

  // Kimin başlayacağını rastgele seç
  let isP1Turn = Math.random() > 0.5;

  // Combat Loop
  while (p1_hp > 0 && p2_hp > 0) {
    // Determine attacker based on turns
    const isP1Attacking = isP1Turn;
    const attacker = isP1Attacking ? p1 : p2;
    const defender = isP1Attacking ? p2 : p1;

    // YENİ SABİT MATEMATİK: Random kaldırıldı!
    // Atak puanından, rakip defansının yarısını çıkarıyoruz.
    // Minimum 1 hasar garantisi veriyoruz ki savaş kilitlenmesiz bitmesin.
    const damage = Math.max(1, Math.floor(attacker.attack - (defender.defense / 2)));
    
    // Apply damage
    if (isP1Attacking) {
      p2_hp -= damage;
    } else {
      p1_hp -= damage;
    }

    const narrative = damage > 0 
      ? `${attacker.name} attacked ${defender.name} and dealt ${damage} damage!` 
      : `${attacker.name} tried to attack, but ${defender.name} blocked it!`;

    const target_current_hp = isP1Attacking ? Math.max(0, p2_hp) : Math.max(0, p1_hp);
    const action_type = target_current_hp <= 0 ? 'CRITICAL' : 'ATTACK';

    console.log(`[Combat] ${narrative} (Defender HP: ${target_current_hp})`);

    try {
      if (process.env.SUPABASE_URL) {
        await supabase.from('combat_logs').insert({
          match_id: matchId,
          actor_id: attacker.id,
          action_type: action_type,
          value: damage,
          narrative,
          target_current_hp
        });
      }
    } catch (err) {
      console.error('[Worker] Superbase log error', err);
    }

    // "Seyir Zevki" gecikmesi
    await new Promise(res => setTimeout(res, 2000));

    // Sırayı karşı tarafa geçir
    isP1Turn = !isP1Turn;

    // End condition
    if (p1_hp <= 0 || p2_hp <= 0) break;
  }

  const winnerId = p1_hp > 0 ? p1.id : p2.id;
  
  try {
    if (process.env.SUPABASE_URL) {
      await supabase.from('matches').update({
        status: 'finished',
        winner_id: winnerId
      }).eq('id', matchId);
      console.log(`[Worker] Match ${matchId} finished. Winner recorded: ${winnerId}`);
    } else {
      console.log(`[Worker] Match ${matchId} finished (Dry Run). Winner: ${winnerId}`);
    }
  } catch (err) {
    console.error('[Worker] Finalize error:', err);
  }

  // TODO: blockchainQueue.add('finalize-match', { matchId, winnerId });
  return { winnerId };

}, { connection });

matchWorker.on('completed', job => {
  console.log(`Job with id ${job.id} has been completed`);
});

matchWorker.on('failed', (job, err) => {
  console.log(`Job with id ${job?.id} has failed with ${err.message}`);
});
