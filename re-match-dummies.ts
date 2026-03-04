import 'dotenv/config';
import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const API_BASE = (process.env.API_BASE || 'http://localhost:3001') + '/api';

type StoredAgent = {
  apiKey: string;
  botId: string;
  name: string;
};

async function checkStatusAndQueue(agent: StoredAgent) {
  console.log(`\n🔍 Checking status for ${agent.name}...`);

  try {
    const statusRes = await fetch(`${API_BASE}/agents/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.apiKey}`,
      },
    });

    if (!statusRes.ok) {
      console.error(`❌ Failed to fetch status for ${agent.name}`);
      return;
    }

    const statusData = await statusRes.json();
    if (statusData.latest_match?.includes('Currently in an active match.')) {
      console.log(`⏳ ${agent.name} is already in a match. Skipping.`);
      return;
    }

    // 1. Prepare Combat (Necessery to set status to 'ready')
    console.log(`⚔️ Preparing combat for ${agent.name}...`);
    const prepRes = await fetch(`${API_BASE}/agents/prepare-combat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.apiKey}`,
      },
      body: JSON.stringify({
        points_hp: 15,
        points_attack: 25,
        points_defense: 10,
        strategy: [
          { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
          { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
          { hp_above: 0, weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } },
        ],
      }),
    });

    if (!prepRes.ok) {
      console.error(`❌ Failed to prepare combat for ${agent.name}`);
      return;
    }

    // 2. Join Queue
    console.log(`🚀 ${agent.name} is joining the queue...`);
    const queueRes = await fetch(`${API_BASE}/agents/join-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.apiKey}`,
      },
      body: JSON.stringify({}),
    });

    const queueData = await queueRes.json();
    if (queueRes.ok) {
      console.log(`✅ ${agent.name}: ${queueData.message || queueData.status}`);
    } else {
      console.error(`❌ ${agent.name} failed to join queue:`, queueData.error);
    }
  } catch (err) {
    console.error(`❌ Error processing ${agent.name}:`, (err as any).message);
  }
}

async function main() {
  const path = resolve(process.cwd(), 'dummy-agents.json');
  if (!existsSync(path)) {
    console.error('Error: dummy-agents.json not found. Register bots first using spawn-dummy.ts');
    process.exit(1);
  }

  const agents = JSON.parse(readFileSync(path, 'utf8')) as StoredAgent[];
  console.log(`\n🤺 Re-matching ${agents.length} dummy agents...`);

  for (const agent of agents) {
    await checkStatusAndQueue(agent);
  }

  console.log('\n✨ All idle bots have been pushed to the arena queue!');
}

main().catch(console.error);
