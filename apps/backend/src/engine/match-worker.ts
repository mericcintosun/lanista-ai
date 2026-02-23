import { Worker } from 'bullmq';
import { supabase } from '../lib/supabase.js';
import { signCombatProof } from '../services/webhook.js';

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

  const MAX_TIMEOUT_STRIKES = 3;
  let p1_timeout_count = 0;
  let p2_timeout_count = 0;

  // Kimin başlayacağını rastgele seç
  let currentTurn = 1;
  let isP1Turn = Math.random() > 0.5;
  let p1_is_defending = false;
  let p2_is_defending = false;

  // Combat Loop
  while (p1_hp > 0 && p2_hp > 0) {
    const activeAgent = isP1Turn ? p1 : p2;
    const targetAgent = isP1Turn ? p2 : p1;

    // 1. STATE (OYUN DURUMU) HAZIRLIĞI
    const gameState = {
      match_id: matchId,
      turn: currentTurn,
      your_state: { 
        hp: isP1Turn ? p1_hp : p2_hp, 
        base_atk: activeAgent.attack, 
        base_def: activeAgent.defense,
        is_defending: isP1Turn ? p1_is_defending : p2_is_defending
      },
      opponent_state: { 
        hp: isP1Turn ? p2_hp : p1_hp,
        is_defending: isP1Turn ? p2_is_defending : p1_is_defending
      },
      prompt: "Sıra sende. Aksiyonunu seç: 'ATTACK' (Saldır) veya 'DEFEND' (Savunma yapıp bir sonraki tur alınan hasarı yarıya indir)."
    };

    let chosenAction = 'ATTACK'; // Default aksiyon
    const timeoutMs = 8000;
    let turnTimeout = false;

    // 2. AJANA SORUYORUZ (LLM Düşünme Payı)
    if (activeAgent.webhook_url) {
      try {
        console.log(`[Turn ${currentTurn}] ${activeAgent.name} düşünülüyor...`);
        const res = await fetch(activeAgent.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gameState),
          signal: AbortSignal.timeout(timeoutMs) // Throw error if it takes longer than 8s
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.action) {
            chosenAction = data.action.toUpperCase(); // 'ATTACK' veya 'DEFEND'
            if (isP1Turn) p1_timeout_count = 0; else p2_timeout_count = 0;
          }
        } else {
          turnTimeout = true;
        }
      } catch (error) {
        console.log(`[Timeout/Error] ${activeAgent.name} webhook cevap veremedi!`);
        turnTimeout = true;
      }
    } else {
      console.log(`[Error] ${activeAgent.name} has no valid webhook URL!`);
      turnTimeout = true;
    }

    // --- 🛡️ CIRCUIT BREAKER (ŞALTER) KONTROLÜ ---
    let disqualified = false;
    
    if (turnTimeout) {
      if (isP1Turn) p1_timeout_count++; else p2_timeout_count++;
      
      const currentStrikes = isP1Turn ? p1_timeout_count : p2_timeout_count;
      
      if (currentStrikes >= MAX_TIMEOUT_STRIKES) {
        // AJAN DİSKALİFİYE EDİLİYOR! HP'sini sıfırla ve döngüyü kır.
        if (isP1Turn) p1_hp = 0; else p2_hp = 0;
        
        const narrative = `🚨 DİSKALİFİYE! ${activeAgent.name}, ${MAX_TIMEOUT_STRIKES} tur boyunca bağlantı kuramadı. Şalter atıyor ve maç sonlandırılıyor!`;
        disqualified = true;
        
        if (process.env.SUPABASE_URL) {
          await supabase.from('combat_logs').insert({
            match_id: matchId,
            actor_id: activeAgent.id,
            action_type: 'DISQUALIFIED',
            value: 0,
            narrative: narrative,
            target_current_hp: 0
          });
        }
        console.log(narrative);
        break; // Döngüden çık, maç bitti!
      } else {
        // Diskalifiye olmadıysa cezası: Varsayılan olarak saldırı yapar.
        chosenAction = 'ATTACK';
        const warnNarrative = `⚠️ Gecikme İhlali (${currentStrikes}/${MAX_TIMEOUT_STRIKES})! ${activeAgent.name} körlemesine saldırıyor.`;
        if (process.env.SUPABASE_URL) {
          await supabase.from('combat_logs').insert({
            match_id: matchId,
            actor_id: activeAgent.id,
            action_type: 'TIMEOUT_PENALTY',
            value: 0,
            narrative: warnNarrative,
            target_current_hp: isP1Turn ? p2_hp : p1_hp
          });
        }
        console.log(warnNarrative);
      }
    }

    // 3. AKSİYONUN İŞLENMESİ (RESOLUTION)
    let damage = 0;
    let narrative = "";

    if (chosenAction === 'DEFEND') {
      if (isP1Turn) p1_is_defending = true;
      else p2_is_defending = true;
      narrative = `${activeAgent.name} savunma pozisyonuna geçti!`;
    } 
    else {
      // Default behavior is ATTACK
      chosenAction = 'ATTACK';
      
      // Saldırı yaparsa savunmayı bırakır
      if (isP1Turn) p1_is_defending = false;
      else p2_is_defending = false;

      // Hedef savunmadaysa defansını 2 ile çarp
      const targetDefense = (isP1Turn ? p2_is_defending : p1_is_defending) ? (targetAgent.defense * 2) : targetAgent.defense;
      
      damage = Math.max(1, Math.floor(activeAgent.attack - (targetDefense / 2)));
      
      if (isP1Turn) p2_hp -= damage;
      else p1_hp -= damage;

      narrative = `${activeAgent.name} saldırdı ve ${damage} hasar verdi!`;
    }

    const target_current_hp = isP1Turn ? Math.max(0, p2_hp) : Math.max(0, p1_hp);
    const action_type = target_current_hp <= 0 ? 'CRITICAL' : chosenAction;

    console.log(`[Combat] ${narrative} (Defender HP: ${target_current_hp})`);

    // 4. SUPABASE LOGLAMA
    try {
      if (process.env.SUPABASE_URL) {
        await supabase.from('combat_logs').insert({
          match_id: matchId,
          actor_id: activeAgent.id,
          action_type: action_type,
          value: damage,
          narrative,
          target_current_hp
        });
      }
    } catch (err) {
      console.error('[Worker] Superbase log error', err);
    }

    // Sırayı karşı tarafa geçir
    isP1Turn = !isP1Turn;
    currentTurn++;

    // End condition
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
        tx_hash: JSON.stringify(proof) // Save signature as proof
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
