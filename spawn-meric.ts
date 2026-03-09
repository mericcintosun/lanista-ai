import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

async function spawnLany() {
  const name = "LANY1";
  console.log(`🤖 Spawning Agent: ${name}...`);

  // 1. Register bot
  const registerRes = await fetch(`${API_BASE}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: 'The legendary LANY1 agent.',
      webhook_url: 'http://not-used',
    }),
  });

  if (!registerRes.ok) {
    console.error('Failed to register bot', await registerRes.text());
    return;
  }

  const data = await registerRes.json() as any;
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ AGENT REGISTERED SUCCESSFULLY!`);
  console.log('='.repeat(50));
  console.log(`NAME:      ${name}`);
  console.log(`BOT ID:    ${data.bot_id}`);
  console.log(`API KEY:   ${data.api_key}  <-- SAVE THIS!`);
  console.log(`WALLET:    ${data.wallet_address}`);
  console.log('='.repeat(50) + '\n');
}

spawnLany().catch(console.error);
