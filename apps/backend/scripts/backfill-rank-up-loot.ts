/**
 * Rank-up Loot Backfill Script
 *
 * Botlar ELO'ya göre zaten bir rank'ta (örn. Silver) ama winnerRep hatası yüzünden
 * o rank için VRF hiç istenmemiş olabilir. Bu script, böyle botlar için eksik
 * rank-up loot isteklerini zincirde açar ve rank_up_loot_requests'e yazar.
 *
 * Gereken env (repo root .env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, RANK_UP_LOOT_NFT_ADDRESS
 *
 * Çalıştır (backend dizininden):
 *   npm run backfill-rank-up-loot
 *   DRY_RUN=1 npm run backfill-rank-up-loot
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '..', '..', '..', '.env') });
import { createClient } from '@supabase/supabase-js';
import { getRankIndex } from '../src/lib/rank.js';
import { requestRankUpLoot } from '../src/services/rankUpLoot.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) required.');
  process.exit(1);
}

if (!DRY_RUN && (!process.env.AVALANCHE_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY || !process.env.RANK_UP_LOOT_NFT_ADDRESS)) {
  console.error('❌ For real run: AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, RANK_UP_LOOT_NFT_ADDRESS required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no on-chain calls\n' : '🎁 Rank-up loot backfill starting\n');

  const { data: bots, error: botsErr } = await supabase
    .from('bots')
    .select('id, wallet_address, elo, total_matches')
    .not('wallet_address', 'is', null);

  if (botsErr) {
    console.error('❌ Failed to fetch bots:', botsErr.message);
    process.exit(1);
  }
  if (!bots?.length) {
    console.log('ℹ️ No bots with wallet_address found.');
    return;
  }

  let requested = 0;
  let skipped = 0;
  let failed = 0;

  for (const bot of bots) {
    const wallet = (bot.wallet_address || '').trim();
    if (!wallet || wallet.length < 40) continue;

    const elo = Number(bot.elo) ?? 0;
    const totalMatches = Number(bot.total_matches) ?? 0;
    const hasPlayed = totalMatches > 0;
    const currentRankIndex = getRankIndex(elo, hasPlayed);

    if (currentRankIndex < 1) continue;

    for (let rankIndex = 1; rankIndex <= currentRankIndex; rankIndex++) {
      const { data: existing } = await supabase
        .from('rank_up_loot_requests')
        .select('id')
        .eq('bot_id', bot.id)
        .eq('new_rank_index', rankIndex)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY] Would request rank-up loot: bot ${bot.id.slice(0, 8)}… rank ${rankIndex} (${wallet.slice(0, 10)}…)`);
        requested++;
        continue;
      }

      const result = await requestRankUpLoot(wallet, rankIndex);
      if (result) {
        try {
          await supabase.from('rank_up_loot_requests').insert({
            bot_id: bot.id,
            request_id: result.requestId,
            wallet_address: wallet,
            new_rank_index: rankIndex,
            match_id: null,
          });
          console.log(`  ✅ ${wallet.slice(0, 10)}… rank ${rankIndex} → requestId ${result.requestId}`);
          requested++;
        } catch (e: unknown) {
          console.warn(`  ⚠️ DB insert failed for bot ${bot.id} rank ${rankIndex}:`, (e as Error)?.message ?? e);
          failed++;
        }
      } else {
        console.warn(`  ⚠️ requestRankUpLoot failed for bot ${bot.id} rank ${rankIndex} (${wallet.slice(0, 10)}…)`);
        failed++;
      }
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`Requested: ${requested} | Skipped (already have): ${skipped} | Failed: ${failed}`);
  if (requested > 0 && !DRY_RUN) {
    console.log('VRF fulfillment is async; inventory will update after Chainlink callback (check backend RankUpLootPoller logs).');
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
