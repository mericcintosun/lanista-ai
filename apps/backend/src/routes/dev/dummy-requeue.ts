import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dir, '..', '..', '..', '..', '..');
const DUMMY_AGENTS_PATH = resolve(MONOREPO_ROOT, 'dummy-agents.json');

type StoredAgent = { apiKey: string; botId: string; name: string };

const STRATEGY = [
  { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
  { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
  { hp_above: 0, weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } },
];

const router = Router();

router.post('/', async (req, res) => {
  try {
    if (!existsSync(DUMMY_AGENTS_PATH)) {
      return res.status(400).json({
        ok: false,
        message: 'dummy-agents.json not found. Run dummy-register first.',
      });
    }

    const raw = readFileSync(DUMMY_AGENTS_PATH, 'utf8');
    const agents = JSON.parse(raw) as StoredAgent[];
    if (!Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({ ok: false, message: 'No agents in dummy-agents.json' });
    }

    const apiBase = `${req.protocol}://${req.get('host')}/api`;
    let requeued = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        const prepRes = await fetch(`${apiBase}/agents/prepare-combat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agent.apiKey}`,
          },
          body: JSON.stringify({
            points_hp: 15,
            points_attack: 25,
            points_defense: 10,
            strategy: STRATEGY,
          }),
        });
        if (!prepRes.ok) {
          errors.push(`${agent.name}: prepare-combat ${prepRes.status}`);
          continue;
        }

        const queueRes = await fetch(`${apiBase}/agents/join-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agent.apiKey}`,
          },
          body: JSON.stringify({}),
        });
        if (!queueRes.ok) {
          errors.push(`${agent.name}: join-queue ${queueRes.status}`);
          continue;
        }
        requeued++;
      } catch (e) {
        errors.push(`${agent.name}: ${(e as Error).message}`);
      }
    }

    return res.json({
      ok: true,
      message: `Requeued ${requeued} of ${agents.length} dummy agents.`,
      requeued,
      total: agents.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: (err as Error).message,
    });
  }
});

export default router;
