/**
 * ELO Backfill Script
 *
 * Tüm geçmiş maçları created_at sırasına göre replay eder ve
 * her botun güncel ELO'sunu hesaplayarak bots tablosunu günceller.
 *
 * Çalıştır:
 *   cd apps/backend
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-elo.ts
 *
 * Ya da .env dosyası varsa:
 *   npx tsx -r dotenv/config scripts/backfill-elo.ts
 */

import { createClient } from '@supabase/supabase-js';
import { calculateElo } from '../src/services/elo.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY env değişkenleri gerekli.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔄  Geçmiş maçlar çekiliyor...');

  // 1. Tüm biten maçları kronolojik sırayla çek
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id, player_1_id, player_2_id, winner_id, created_at')
    .eq('status', 'finished')
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: true });

  if (matchErr) { console.error('❌  Maç çekme hatası:', matchErr); process.exit(1); }
  if (!matches?.length) { console.log('ℹ️  Biten maç bulunamadı.'); return; }

  console.log(`📊  ${matches.length} maç bulundu. ELO replay başlıyor...\n`);

  // 2. Her botun in-memory ELO ve maç sayısını takip et (hepsi 0'dan başlar)
  const eloMap:     Record<string, number> = {};
  const matchMap:   Record<string, number> = {};

  const getElo   = (id: string) => eloMap[id]   ?? 0;
  const getCount = (id: string) => matchMap[id]  ?? 0;

  let processed = 0;

  for (const match of matches) {
    const { player_1_id, player_2_id, winner_id } = match;
    if (!winner_id) continue;

    const loserId = winner_id === player_1_id ? player_2_id : player_1_id;

    const winnerEloBefore = getElo(winner_id);
    const loserEloBefore  = getElo(loserId);
    const winnerMatches   = getCount(winner_id);
    const loserMatches    = getCount(loserId);

    const result = calculateElo(winnerEloBefore, loserEloBefore, winnerMatches, loserMatches);

    // ELO güncelle
    eloMap[winner_id] = result.newWinnerElo;
    eloMap[loserId]   = result.newLoserElo;

    // Maç sayısı güncelle
    matchMap[winner_id] = winnerMatches + 1;
    matchMap[loserId]   = loserMatches  + 1;

    processed++;
    if (processed % 50 === 0) {
      process.stdout.write(`  ✔  ${processed}/${matches.length} maç işlendi\r`);
    }
  }

  console.log(`\n✅  ${processed} maç işlendi. DB güncelleniyor...\n`);

  // 3. Tüm botları toplu güncelle (her bot için ayrı UPDATE)
  const botIds = Object.keys(eloMap);
  let updated = 0;

  for (const botId of botIds) {
    const { error } = await supabase
      .from('bots')
      .update({
        elo:           eloMap[botId],
        total_matches: matchMap[botId] ?? 0,
      })
      .eq('id', botId);

    if (error) {
      console.error(`  ⚠️  ${botId} güncellenemedi:`, error.message);
    } else {
      updated++;
    }
  }

  // 4. Sonuçları göster
  console.log(`\n🏆  Backfill tamamlandı! ${updated}/${botIds.length} bot güncellendi.\n`);
  console.log('─────────────────────────────────────────────────');
  console.log('BOT ID (kısa)          ELO        MAÇLAR');
  console.log('─────────────────────────────────────────────────');

  const sorted = botIds
    .map(id => ({ id, elo: eloMap[id], matches: matchMap[id] ?? 0 }))
    .sort((a, b) => b.elo - a.elo);

  for (const bot of sorted) {
    const shortId = bot.id.substring(0, 20).padEnd(20);
    const elo     = String(bot.elo).padStart(6);
    const m       = String(bot.matches).padStart(6);
    console.log(`  ${shortId}   ${elo}   ${m}`);
  }

  console.log('─────────────────────────────────────────────────\n');
}

main().catch(err => { console.error('❌  Beklenmeyen hata:', err); process.exit(1); });
