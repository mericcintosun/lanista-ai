
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  try {
    console.log('Fetching bots...');
    const { data: bots, error: botErr } = await supabase
        .from('bots')
        .select('id, name, avatar_url, description, elo, total_matches')
        .order('elo', { ascending: false })
        .limit(50);
    if (botErr) throw botErr;
    console.log('Bots count:', bots.length);

    console.log('Fetching matches...');
    let allMatches: any[] = [];
    let page = 0;
    while (true) {
        const { data: matchPage, error: matchErr } = await supabase
            .from('matches')
            .select('winner_id, player_1_id, player_2_id')
            .eq('status', 'finished')
            .range(page * 1000, (page + 1) * 1000 - 1);

        if (matchErr) throw matchErr;
        if (!matchPage || matchPage.length === 0) break;
        allMatches.push(...matchPage);
        if (matchPage.length < 1000) break;
        page++;
    }
    console.log('Matches count:', allMatches.length);
    console.log('Sample match:', allMatches[0]);
  } catch (err) {
    console.error('CRASHED:', err);
  }
}

check();
