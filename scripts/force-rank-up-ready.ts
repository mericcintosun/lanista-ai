/**
 * Set a bot's ELO to 29 so the next win will rank them up (Iron → Bronze).
 * Run: npx tsx scripts/force-rank-up-ready.ts [botId]
 * Or without args: lists bots and picks the first one with wallet_address.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
import dotenv from 'dotenv';
dotenv.config({ path: resolve(__dir, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!
);

const RANK_THRESHOLDS = [0, 30, 100, 200, 350, 600, 1000]; // Iron, Bronze, Silver, Gold, Plat, Diamond, Master

function getRank(elo: number): string {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (elo >= RANK_THRESHOLDS[i]) return ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLAT', 'DIAMOND', 'MASTER'][i];
  }
  return 'IRON';
}

async function main() {
  const botId = process.argv[2];

  if (botId) {
    const { data, error } = await supabase.from('bots').select('id, name, elo, total_matches, wallet_address').eq('id', botId).single();
    if (error || !data) {
      console.error('Bot not found:', botId);
      process.exit(1);
    }
    if (!data.wallet_address) {
      console.error('Bot has no wallet_address — rank-up loot requires it.');
      process.exit(1);
    }
    await supabase.from('bots').update({ elo: 29 }).eq('id', botId);
    console.log(`✅ ${data.name} (${botId.slice(0, 8)}…) ELO set to 29. Next win → Bronze rank-up.`);
    return;
  }

  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, elo, total_matches, wallet_address')
    .not('wallet_address', 'is', null)
    .order('elo', { ascending: true })
    .limit(20);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log('Bots (low ELO first). Set one to ELO 29 for rank-up test:\n');
  for (const b of bots || []) {
    const rank = getRank(b.elo ?? 0);
    const ready = (b.elo ?? 0) < 30 ? '← rank-up ready if set to 29' : '';
    console.log(`  ${b.name?.padEnd(12)} ELO=${String(b.elo ?? 0).padStart(4)} ${rank.padEnd(8)} ${b.id} ${ready}`);
  }
  console.log('\nUsage: npx tsx scripts/force-rank-up-ready.ts <botId>');
}

main().catch(console.error);
