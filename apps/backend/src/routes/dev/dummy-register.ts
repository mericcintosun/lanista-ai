import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dir, '..', '..', '..', '..', '..');
const DUMMY_AGENTS_PATH = resolve(MONOREPO_ROOT, 'dummy-agents.json');

type RegisteredAgent = { apiKey: string; botId: string; name: string };

// Shorter dummy name list than CLI script, but same idea:
const BOT_BASE_NAMES: string[] = [
  'Aria', 'Nyx', 'Vex', 'Kairo', 'Nova', 'Zara', 'Lynx', 'Vanta', 'Coda', 'Echo',
  'Flux', 'Ion', 'Jinx', 'Kora', 'Lumen', 'Mira', 'Nero', 'Orion', 'Pyra', 'Quill',
  'Riven', 'Sylph', 'Titan', 'Umbra', 'Vega', 'Warden', 'Xero', 'Yara', 'Zeph',
];

const usedNameCounts = new Map<string, number>();

function nextBotName() {
  const base = BOT_BASE_NAMES[Math.floor(Math.random() * BOT_BASE_NAMES.length)];
  const currentCount = usedNameCounts.get(base) ?? 0;
  const nextCount = currentCount + 1;
  usedNameCounts.set(base, nextCount);
  return nextCount === 1 ? base : `${base}${nextCount}`;
}

const router = Router();

router.post('/', async (req, res) => {
  const apiBase = `${req.protocol}://${req.get('host')}/api`;
  const spawnCount = Number(process.env.SPAWN_COUNT || req.body?.count || 4) || 4;

  const registered: RegisteredAgent[] = [];
  if (existsSync(DUMMY_AGENTS_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(DUMMY_AGENTS_PATH, 'utf8')) as RegisteredAgent[];
      if (Array.isArray(existing)) registered.push(...existing);
    } catch {
      // ignore corrupted file, we'll overwrite below
    }
  }

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < spawnCount; i++) {
    const name = nextBotName();
    try {
      // 1) Register dummy bot via public API to reuse full logic (wallet, passport, etc.)
      const registerRes = await fetch(`${apiBase}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: 'An automated sparring partner.',
          webhook_url: 'http://not-used',
        }),
      });

      if (!registerRes.ok) {
        const body = await registerRes.text();
        errors.push(`register(${name}): ${registerRes.status} ${body}`);
        continue;
      }

      const { api_key, bot_id } = (await registerRes.json()) as any;

      // 2) Prepare combat
      const prepRes = await fetch(`${apiBase}/agents/prepare-combat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          points_hp: 15,
          points_attack: 25,
          points_defense: 10,
          strategy: [
            { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
            { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
            { hp_above: 0,  weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } },
          ],
        }),
      });

      if (!prepRes.ok) {
        const body = await prepRes.text();
        errors.push(`prepare-combat(${name}): ${prepRes.status} ${body}`);
        continue;
      }

      // 3) Join queue
      const queueRes = await fetch(`${apiBase}/agents/join-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({}),
      });

      if (!queueRes.ok) {
        const body = await queueRes.text();
        errors.push(`join-queue(${name}): ${queueRes.status} ${body}`);
        continue;
      }

      registered.push({ apiKey: api_key, botId: bot_id, name });
      created++;
    } catch (e: any) {
      errors.push(`spawn(${name}): ${e?.message || String(e)}`);
    }
  }

  try {
    writeFileSync(DUMMY_AGENTS_PATH, JSON.stringify(registered, null, 2), 'utf8');
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      message: `Failed to persist dummy-agents.json: ${e?.message || String(e)}`,
      created,
      total: registered.length,
      errors,
    });
  }

  return res.json({
    ok: errors.length === 0,
    message: `Registered ${created} dummy agents (total stored: ${registered.length}).`,
    created,
    total: registered.length,
    errors: errors.length ? errors : undefined,
  });
});

export default router;
