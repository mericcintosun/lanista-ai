/**
 * Passport Reputation Backfill Script
 *
 * Passport (ERC-8004) may have remained unupdated on-chain for totalMatches/wins/reputation
 * (during winnerRep error period, matches finished but blockchain job did not run).
 * This script writes bots table's reputation_score, total_matches, wins to the on-chain
 * passport; so "Battles / Wins" displays correctly in the UI.
 *
 * Required env (repo root .env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, AGENT_PASSPORT_CONTRACT_ADDRESS
 *
 * Run (from backend directory):
 *   npm run backfill-passport-reputation
 *   DRY_RUN=1 npm run backfill-passport-reputation
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '..', '..', '..', '.env') });

import { createClient } from '@supabase/supabase-js';
import { getPassportByBotWallet, updateReputationOnChain } from '../src/services/passport.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) required.');
  process.exit(1);
}

if (!DRY_RUN && (!process.env.AVALANCHE_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY || !process.env.AGENT_PASSPORT_CONTRACT_ADDRESS)) {
  console.error('❌ For real run: AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, AGENT_PASSPORT_CONTRACT_ADDRESS required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no on-chain writes\n' : '🛂 Passport reputation backfill (DB → chain)\n');

  const { data: bots, error: botsErr } = await supabase
    .from('bots')
    .select('id, name, wallet_address, reputation_score, total_matches, wins')
    .not('wallet_address', 'is', null);

  if (botsErr) {
    console.error('❌ Failed to fetch bots:', botsErr.message);
    process.exit(1);
  }
  if (!bots?.length) {
    console.log('ℹ️ No bots with wallet_address found.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let noPassport = 0;

  for (const bot of bots) {
    const wallet = (bot.wallet_address || '').trim();
    if (!wallet || wallet.length < 40) continue;

    const passport = await getPassportByBotWallet(wallet);
    if (!passport) {
      noPassport++;
      continue;
    }

    const rep = Number(bot.reputation_score) ?? 100;
    const total = Math.max(0, Math.min(0xffff_ffff, Number(bot.total_matches) ?? 0));
    const winsCount = Math.max(0, Math.min(0xffff_ffff, Number(bot.wins) ?? 0));

    const alreadyInSync =
      passport.totalMatches === total &&
      passport.wins === winsCount &&
      passport.reputationScore === rep;

    if (alreadyInSync) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] Would sync: ${bot.name ?? bot.id.slice(0, 8)} → rep=${rep} matches=${total} wins=${winsCount}`);
      updated++;
      continue;
    }

    const ok = await updateReputationOnChain(wallet, rep, total, winsCount);
    if (ok) {
      console.log(`  ✅ ${wallet.slice(0, 10)}… ${bot.name ?? ''} → ${total} battles, ${winsCount} wins`);
      updated++;
    } else {
      console.warn(`  ⚠️ Failed to update passport for ${wallet.slice(0, 10)}…`);
      failed++;
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`Updated: ${updated} | Skipped (in sync): ${skipped} | No passport: ${noPassport} | Failed: ${failed}`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
