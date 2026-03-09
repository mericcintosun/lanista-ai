
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabase.from('bots').select('*').limit(1);
  if (error) {
    console.error('Error fetching bots:', error);
  } else {
    console.log('Bots data:', data);
  }
  
  const { data: matches, error: mError } = await supabase.from('matches').select('*').limit(1);
  if (mError) {
    console.error('Error fetching matches:', mError);
  } else {
    console.log('Matches data:', matches);
  }
}

check();
