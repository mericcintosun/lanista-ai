import 'dotenv/config';
import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const API_BASE = process.env.API_BASE || 'https://backend-production-9598.up.railway.app/api';

type StoredAgent = {
  apiKey: string;
  botId: string;
  name: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tracks last re-queue time per bot so we don't re-queue more often than every 5 seconds.
const lastRequeueAt = new Map<string, number>();

async function isAgentInActiveMatch(agent: StoredAgent): Promise<boolean> {
  const res = await fetch(`${API_BASE}/agents/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agent.apiKey}`,
    },
  });

  if (!res.ok) {
    console.error(`Failed to fetch status for ${agent.name}`, await res.text());
    return false;
  }

  const data = (await res.json()) as {
    latest_match?: string;
  };

  // Backend returns a human-readable latest_match string.
  // If it says "Currently in an active match." we skip this agent.
  return data.latest_match?.includes('Currently in an active match.') ?? false;
}

async function requeueAgentIfIdle(agent: StoredAgent) {
  const inActiveMatch = await isAgentInActiveMatch(agent);
  if (inActiveMatch) {
    return;
  }

  const now = Date.now();
  const last = lastRequeueAt.get(agent.botId) ?? 0;
  if (now - last < 30000) {
    // This bot was queued less than 30 seconds ago; skip to avoid blocking other bots.
    return;
  }

  console.log(`♻️ Re-arming idle agent ${agent.name} (${agent.botId})`);

  // 1) Stats + strategy tekrar kilitle (status: ready)
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
    console.error(`Failed to prepare-combat for ${agent.name}`, await prepRes.text());
    return;
  }

  // 2) Re-add to matchmaking queue
  const queueRes = await fetch(`${API_BASE}/agents/join-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agent.apiKey}`,
    },
    body: JSON.stringify({}),
  });

  const queueData = (await queueRes.json()) as any;
  if (queueRes.ok) {
    console.log(`✅ Re-queued ${agent.name}:`, queueData.message || queueData.status);
    lastRequeueAt.set(agent.botId, Date.now());
  } else {
    console.error(`Failed to re-queue ${agent.name}`, queueData);
  }
}

async function main() {
  const path = resolve(process.cwd(), 'dummy-agents.json');
  if (!existsSync(path)) {
    console.error('dummy-agents.json not found. Run spawn-dummy.ts once to create bots first.');
    process.exit(1);
  }

  const raw = readFileSync(path, 'utf8');
  const agents = JSON.parse(raw) as StoredAgent[];

  if (!agents.length) {
    console.error('No agents found in dummy-agents.json');
    process.exit(1);
  }

  console.log(`\n--- Continuous requeue loop for ${agents.length} dummy agents (tick = 3s) ---`);

  // Infinite loop: check all agents every 3 seconds.
  // Re-prepare and re-queue those not in an active match.
  // Press Ctrl+C to exit.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const agent of agents) {
      await requeueAgentIfIdle(agent);
    }

    await sleep(3000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


