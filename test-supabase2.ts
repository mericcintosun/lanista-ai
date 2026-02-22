import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://apozmcsvomyfmppzxfzr.supabase.co', 'sb_secret_X0gvG7igN0WoTcdsimgIjA_6NOh7wrc');
async function run() {
  const p1 = {
    id: "d0b43ae2-ad79-4ff1-a541-61014e7a835a",
    name: 'Openclaw Alpha',
    hp: 1000,
    attack: 150,
    defense: 50,
  }
  const { data: b1, error: e1 } = await supabase.from('bots').upsert([p1]);
  console.log("Upsert bots:", e1);
}
run();
