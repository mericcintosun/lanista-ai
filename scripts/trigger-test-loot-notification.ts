/**
 * Trigger a loot drop notification by updating a pending rank_up_loot_requests row.
 * This fires Supabase Realtime → frontend shows the banner.
 *
 * Requires at least one row with fulfilled_at IS NULL (pending VRF).
 * Run: npx tsx scripts/trigger-test-loot-notification.ts
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

async function main() {
  const { data: pending, error } = await supabase
    .from('rank_up_loot_requests')
    .select('id, bot_id, new_rank_index, match_id')
    .is('fulfilled_at', null)
    .not('request_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }

  if (!pending) {
    console.log('No pending rank_up_loot_requests. Create one by having a bot rank up (win at ELO 29).');
    console.log('See: npx tsx scripts/force-rank-up-ready.ts');
    process.exit(0);
  }

  const itemId = 7;
  const { error: updErr } = await supabase
    .from('rank_up_loot_requests')
    .update({ fulfilled_at: new Date().toISOString(), item_id: itemId })
    .eq('id', pending.id);

  if (updErr) {
    console.error('Update failed:', updErr.message);
    process.exit(1);
  }

  console.log('✅ Updated rank_up_loot_requests → Realtime should fire. Check frontend for banner.');
  console.log('   (Bot:', pending.bot_id, '| Item #' + itemId + ')');
}

main().catch(console.error);
