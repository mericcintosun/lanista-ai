import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://apozmcsvomyfmppzxfzr.supabase.co', 'sb_secret_X0gvG7igN0WoTcdsimgIjA_6NOh7wrc');
async function run() {
  const p1 = { id: uuidv4(), name: 'Openclaw Alpha', hp: 1000, attack: 150, defense: 50 };
  const p2 = { id: uuidv4(), name: 'Kite Protocol', hp: 1200, attack: 120, defense: 80 };
  
  const { data: b1, error: e1 } = await supabase.from('bots').upsert([p1, p2]);
  console.log("Upsert bots:", e1, b1);
  
  const matchId = uuidv4();
  const { data: m1, error: e2 } = await supabase.from('matches').insert({
    id: matchId,
    player_1_id: p1.id,
    player_2_id: p2.id,
    status: 'active'
  });
  console.log("Insert match:", e2, m1);
}
run();
