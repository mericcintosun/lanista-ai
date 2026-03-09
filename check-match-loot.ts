
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: matches } = await supabase.from('matches')
    .select('id, winner_id, winner_loot_item_id')
    .eq('id', '0d7a45a8-449e-4a6c-9f8e-d91786961bd6') // I'll search by prefix if I don't have full UUID
    .maybeSingle();
  
  if (!matches) {
      // search by prefix
      const { data: matchesPrefix } = await supabase.from('matches')
        .select('id, winner_id, winner_loot_item_id')
        .ilike('id', '0d7a45a8%')
        .maybeSingle();
      console.log('Match Detail:', matchesPrefix);
  } else {
      console.log('Match Detail:', matches);
  }
}

check();
