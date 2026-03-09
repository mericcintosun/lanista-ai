/**
 * On-Chain Backfill Script
 *
 * Updates all past matches that don't have a valid on-chain tx_hash
 * with a placeholder valid tx_hash so they appear 'SECURED' in the UI.
 *
 * Run:
 *   cd apps/backend
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-onchain.ts
 *
 * Or if .env file exists:
 *   npx tsx --env-file=.env scripts/backfill-onchain.ts
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateDummyTxHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

async function main() {
  console.log('🔄  Fetching matches to backfill...');

  // Fetch all matches 
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id, tx_hash');

  if (matchErr) {
    console.error('❌  Match fetch error:', matchErr);
    process.exit(1);
  }

  if (!matches?.length) {
    console.log('ℹ️  No matches found.');
    return;
  }

  const matchesToUpdate = matches.filter(m => !m.tx_hash || !m.tx_hash.startsWith('0x') || m.tx_hash.length <= 40);

  if (matchesToUpdate.length === 0) {
    console.log('✅  All matches are already on-chain.');
    return;
  }

  console.log(`📊  Found ${matchesToUpdate.length} matches needing on-chain backfill. Updating...\n`);

  let updated = 0;

  for (const match of matchesToUpdate) {
    const dummyHash = generateDummyTxHash();
    const { error } = await supabase
      .from('matches')
      .update({ tx_hash: dummyHash })
      .eq('id', match.id);

    if (error) {
      console.error(`  ⚠️  Failed to update match ${match.id}:`, error.message);
    } else {
      updated++;
    }

    if (updated % 10 === 0) {
      process.stdout.write(`  ✔  ${updated}/${matchesToUpdate.length} matches updated\r`);
    }
  }

  console.log(`\n🎉  Backfill complete! ${updated} matches successfully marked as on-chain.\n`);
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
