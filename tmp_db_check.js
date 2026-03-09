import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_policies'); // We might not have this RPC.
  // Instead let's just do a direct PG query if we can, but we don't have pg connection string.
  // Let's at least try inserting a message using REST to realtime.messages? No, we can't.
  
  console.log("Supabase connected");
}
check();
