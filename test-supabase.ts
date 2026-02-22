import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://apozmcsvomyfmppzxfzr.supabase.co', 'sb_secret_X0gvG7igN0WoTcdsimgIjA_6NOh7wrc');
async function run() {
  const { data, error } = await supabase.from('combat_logs').insert({
    match_id: '10957190-1ccd-4ea6-91ee-552ebe44aa50',
    actor_id: 'd0b43ae2-ad79-4ff1-a541-61014e7a835a',
    action_type: 'ATTACK',
    value: 10,
    narrative: 'Test',
    target_current_hp: 100
  });
  console.log(error);
}
run();
