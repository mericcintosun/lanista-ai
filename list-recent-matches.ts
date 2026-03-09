
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: matches } = await supabase.from('matches')
    .select('id, winner_id, winner_loot_item_id, status')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('Recent matches:');
  matches?.forEach(m => {
      console.log(`ID: ${m.id} | Winner: ${m.winner_id} | Loot Item: ${m.winner_loot_item_id} | Status: ${m.status}`);
  });
}

check();
