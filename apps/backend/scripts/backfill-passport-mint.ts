/**
 * Passport Mint Backfill Script
 *
 * Mints passports for bots that have wallet_address but no on-chain passport.
 * Use when bots were created before passport minting was added to registration,
 * or when mint jobs failed.
 *
 * Required env (repo root .env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, AGENT_PASSPORT_CONTRACT_ADDRESS
 *
 * Run (from backend directory):
 *   npm run backfill-passport-mint
 *   DRY_RUN=1 npm run backfill-passport-mint
 *   WALLET=0xDcbEF4358Fb6AB7c1ce037f3ACEaA62aDc5394c6 npm run backfill-passport-mint  # single bot
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '..', '..', '..', '.env') });

import { createClient } from '@supabase/supabase-js';
import { getPassportByBotWallet, mintPassport } from '../src/services/passport.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const WALLET_FILTER = process.env.WALLET?.trim().toLowerCase();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) required.');
  process.exit(1);
}

if (!DRY_RUN && (!process.env.AVALANCHE_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY || !process.env.AGENT_PASSPORT_CONTRACT_ADDRESS)) {
  console.error('❌ For real run: AVALANCHE_RPC_URL, DEPLOYER_PRIVATE_KEY, AGENT_PASSPORT_CONTRACT_ADDRESS required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getMetadataURI(walletAddress: string): string {
  const baseUrl = (process.env.API_PUBLIC_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  return baseUrl
    ? `${baseUrl}/api/nft/passport-metadata/by-wallet/${encodeURIComponent(walletAddress)}`
    : '';
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no on-chain mints\n' : '🛂 Passport mint backfill (DB bots without passport → chain)\n');

  const { data: bots, error: botsErr } = await supabase
    .from('bots')
    .select('id, name, wallet_address')
    .not('wallet_address', 'is', null);

  if (botsErr) {
    console.error('❌ Failed to fetch bots:', botsErr.message);
    process.exit(1);
  }
  if (!bots?.length) {
    console.log('ℹ️ No bots with wallet_address found.');
    return;
  }

  let minted = 0;
  let skipped = 0;
  let failed = 0;

  for (const bot of bots) {
    const wallet = (bot.wallet_address || '').trim();
    if (!wallet || wallet.length < 40) continue;
    if (WALLET_FILTER && wallet.toLowerCase() !== WALLET_FILTER) continue;

    const passport = await getPassportByBotWallet(wallet);
    if (passport) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] Would mint passport for ${bot.name ?? bot.id.slice(0, 8)} (${wallet.slice(0, 10)}…)`);
      minted++;
      continue;
    }

    const metadataURI = getMetadataURI(wallet);
    const result = await mintPassport(wallet, null, metadataURI);
    if (result) {
      console.log(`  ✅ Minted passport for ${bot.name ?? bot.id.slice(0, 8)} (${wallet.slice(0, 10)}…) tokenId=${result.tokenId}`);
      minted++;
    } else {
      console.warn(`  ⚠️ Failed to mint passport for ${wallet.slice(0, 10)}…`);
      failed++;
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`Minted: ${minted} | Skipped (already have passport): ${skipped} | Failed: ${failed}`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
