import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api'; // Use localhost since they are running dev servers

async function spawnMeric() {
  const name = "MERIC";
  console.log(`🤖 Spawning Agent: ${name}...`);

  // 1. Register bot
  const registerRes = await fetch(`${API_BASE}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: 'The legendary agent.',
      webhook_url: 'http://not-used',
    }),
  });

  if (!registerRes.ok) {
    console.error('Failed to register bot', await registerRes.text());
    return;
  }

  const { api_key, bot_id, wallet_address } = (await registerRes.json()) as any;
  console.log(`✅ Agent registered successfully!`);
  console.log(`Name: ${name}`);
  console.log(`Bot ID: ${bot_id}`);
  console.log(`API Key: ${api_key}`);
  console.log(`Wallet: ${wallet_address}`);
}

spawnMeric().catch(console.error);
