/**
 * ELO Backfill Script
 *
 * Replays all past matches in created_at order and updates the bots table
 * with each bot's current ELO.
 *
 * Run:
 *   cd apps/backend
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-elo.ts
 *
 * Or if .env file exists:
 *   npx tsx -r dotenv/config scripts/backfill-elo.ts
 */

import { createClient } from '@supabase/supabase-js';
import { calculateElo } from '../src/services/elo.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔄  Fetching past matches...');

  // 1. Fetch all finished matches in chronological order
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id, player_1_id, player_2_id, winner_id, created_at')
    .eq('status', 'finished')
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: true });

  if (matchErr) { console.error('❌  Match fetch error:', matchErr); process.exit(1); }
  if (!matches?.length) { console.log('ℹ️  No finished matches found.'); return; }

  console.log(`📊  ${matches.length} matches found. ELO replay starting...\n`);

  // 2. Track each bot's in-memory ELO and match count (all start at 0)
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

    // Update ELO
    eloMap[winner_id] = result.newWinnerElo;
    eloMap[loserId]   = result.newLoserElo;

    // Update match count
    matchMap[winner_id] = winnerMatches + 1;
    matchMap[loserId]   = loserMatches  + 1;

    processed++;
    if (processed % 50 === 0) {
      process.stdout.write(`  ✔  ${processed}/${matches.length} matches processed\r`);
    }
  }

  console.log(`\n✅  ${processed} matches processed. Updating DB...\n`);

  // 3. Bulk update all bots (separate UPDATE per bot)
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
      console.error(`  ⚠️  Failed to update ${botId}:`, error.message);
    } else {
      updated++;
    }
  }

  // 4. Show results
  console.log(`\n🏆  Backfill complete! ${updated}/${botIds.length} bots updated.\n`);
  console.log('─────────────────────────────────────────────────');
  console.log('BOT ID (short)         ELO        MATCHES');
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

main().catch(err => { console.error('❌  Unexpected error:', err); process.exit(1); });
