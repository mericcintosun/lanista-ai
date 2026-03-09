import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We define sleep to simulate time passing
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('--- 🎮 LANISTA PREDICTION SYSTEM SIMULATOR ---');
  
  // 1. Fetch 2 random bots to fight
  console.log('\\n[1] Fetching bots for the match...');
  const { data: bots, error: botErr } = await supabase.from('bots').select('id, name').limit(2);
  if (botErr || !bots || bots.length < 2) {
    console.error('Failed to fetch bots:', botErr);
    return;
  }
  const bot1 = bots[0];
  const bot2 = bots[1];
  console.log(`Fighters: [${bot1.name}] vs [${bot2.name}]`);

  // 2. Fetch 3 users to act as supporters
  console.log('\\n[2] Fetching users to simulate predictions...');
  // We get users with >200 sparks from spark_balances
  const { data: balances, error: userErr } = await supabase.from('spark_balances').select('user_id, balance').gt('balance', 200).limit(3);
  if (userErr || !balances || balances.length < 3) {
    console.error('Failed to fetch users from balances:', userErr);
    return;
  }
  const users = balances.map(b => ({ id: b.user_id, email: b.user_id.substring(0,6) }));
  
  // Print initial balances
  for (const u of balances) {
    console.log(`User ${u.user_id.substring(0,6)}: ${u.balance || 0} sparks`);
  }

  // 3. Create a Match
  console.log('\\n[3] Creating a pending match (Lobby Phase)...');
  const lobbyEndsAt = new Date(Date.now() + 45_000).toISOString();
  const { data: match, error: matchErr } = await supabase.from('matches').insert({
    player_1_id: bot1.id,
    player_2_id: bot2.id,
    status: 'pending',
    lobby_ends_at: lobbyEndsAt
  }).select().single();

  if (matchErr || !match) {
    console.error('Match creation failed:', matchErr);
    return;
  }
  console.log(`Match created! ID: ${match.id}`);
  console.log(`Lobby open until: ${lobbyEndsAt}`);

  // 4. Simulate Supports
  console.log('\\n[4] Simulating user predictions (spending sparks)...');
  const supports = [
    { user: users[0], bot: bot1, field: 'support_player_1', amount: 50 },
    { user: users[1], bot: bot1, field: 'support_player_1', amount: 150 },
    { user: users[2], bot: bot2, field: 'support_player_2', amount: 100 },
  ];

  for (const s of supports) {
    console.log(`User ${s.user.email} is predicting ${s.bot.name} with ${s.amount} sparks...`);
    const { error: spendErr } = await supabase.rpc('spark_spend', {
      p_user_id: s.user.id,
      p_amount: s.amount,
      p_tx_type: s.field,
      p_reference_id: match.id
    });
    if (spendErr) {
      console.error(`  ❌ Failed to spend:`, spendErr.message);
    } else {
      console.log(`  ✅ Success`);
    }
    await sleep(500);
  }

  // 5. Finish Match
  console.log('\\n[5] Simulating match completion...');
  const winner = bot1; // Let's make bot1 the winner
  const loser = bot2;
  console.log(`Winner decided! 🏆 ${winner.name} defeated ${loser.name}`);
  
  const { error: updateErr } = await supabase.from('matches').update({
    status: 'finished',
    winner_id: winner.id
  }).eq('id', match.id);

  if (updateErr) {
    console.error('Match update failed:', updateErr);
    return;
  }
  console.log('Match status set to finished.');

  // 6. Settle Predictions
  console.log('\\n[6] Running prediction settlement...');
  const { settleMatchPredictions } = await import('./engine/prediction-worker.js');
  await settleMatchPredictions(match.id, winner.id);

  console.log('\\n[7] Checking final outcomes & balances...');
  // View transactions for this match
  const { data: txs } = await supabase.from('spark_transactions').select('*').eq('reference_id', match.id);
  
  console.log('\\n--- Match Transactions ---');
  for (const t of txs || []) {
    const u = users.find(x => x.id === t.user_id)?.email || 'SYSTEM';
    console.log(`[${t.transaction_type}] ${u}: ${t.amount}`);
  }

  console.log('\\n--- Final Balances ---');
  for (const u of users) {
    const { data: bal } = await supabase.from('spark_balances').select('balance').eq('user_id', u.id).single();
    console.log(`User ${u.email}: ${bal?.balance || 0} sparks`);
  }
  
  console.log('\\n✅ Simulation Complete!');
}

main().catch(console.error);
