import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase.js';
import { calculateFinalStats } from '../../engine/referee.js';
import { validateStrategy } from '../../engine/strategy.js';
import { redis } from '../shared.js';
import { findMatch } from '../../engine/matchmaker.js';

const router = Router();

const DUMMY_DESCRIPTION = '[arena-dummy]';

const BOT_NAMES = [
  'Aria', 'Nyx', 'Vex', 'Kairo', 'Nova', 'Zara', 'Lynx', 'Vanta', 'Coda', 'Echo',
  'Flux', 'Ion', 'Jinx', 'Kora', 'Lumen', 'Mira', 'Nero', 'Orion', 'Pyra', 'Quill',
  'Riven', 'Sylph', 'Titan', 'Umbra', 'Vega', 'Warden', 'Xero', 'Yara', 'Zeph', 'Axiom',
  'Bishop', 'Cipher', 'Drift', 'Ember', 'Frost', 'Glitch', 'Halo', 'Iris', 'Jade', 'Keen',
  'Loki', 'Mosaic', 'Nexus', 'Onyx', 'Pulse', 'Quartz', 'Rogue', 'Strata', 'Talon', 'Unity',
  'Vesper', 'Whisper', 'Xenon', 'Zenith', 'Astra', 'Chrome', 'Delta', 'Ghost', 'Havoc', 'Karma',
  'Myth', 'Neon', 'Proxy', 'Reverie', 'Static', 'Trace', 'Ultra', 'Vortex', 'Warp', 'Zen',
  'Arc', 'Blitz', 'Crux', 'Dusk', 'Edge', 'Fade', 'Gale', 'Haze', 'Ivy', 'Juno',
  'Luxe', 'Muse', 'Omen', 'Rift', 'Shard', 'Tide', 'Vale', 'Wire', 'Aegis', 'Beacon',
  'Catalyst', 'Eclipse', 'Golem', 'Helix', 'Oracle', 'Phantom', 'Sentinel', 'Atlas', 'Tempest', 'Zodiac',
];

const STRATEGIES = [
  // Berserker
  [
    { hp_above: 50, weights: { ATTACK: 40, HEAVY_ATTACK: 50, DEFEND: 5, HEAL: 5 } },
    { hp_above: 0, weights: { ATTACK: 30, HEAVY_ATTACK: 60, DEFEND: 5, HEAL: 5 } },
  ],
  // Tank
  [
    { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 5, DEFEND: 30, HEAL: 15 } },
    { hp_above: 30, weights: { ATTACK: 20, HEAVY_ATTACK: 0, DEFEND: 35, HEAL: 45 } },
    { hp_above: 0, weights: { ATTACK: 10, HEAVY_ATTACK: 0, DEFEND: 40, HEAL: 50 } },
  ],
  // Assassin
  [
    { hp_above: 80, weights: { ATTACK: 30, HEAVY_ATTACK: 60, DEFEND: 5, HEAL: 5 } },
    { hp_above: 40, weights: { ATTACK: 50, HEAVY_ATTACK: 15, DEFEND: 20, HEAL: 15 } },
    { hp_above: 0, weights: { ATTACK: 70, HEAVY_ATTACK: 25, DEFEND: 0, HEAL: 5 } },
  ],
  // Balanced
  [
    { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
    { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
    { hp_above: 0, weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } },
  ],
  // Regenerator
  [
    { hp_above: 60, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 20, HEAL: 30 } },
    { hp_above: 30, weights: { ATTACK: 20, HEAVY_ATTACK: 0, DEFEND: 30, HEAL: 50 } },
    { hp_above: 0, weights: { ATTACK: 30, HEAVY_ATTACK: 5, DEFEND: 25, HEAL: 40 } },
  ],
];

const STAT_BUILDS = [
  { points_hp: 15, points_attack: 25, points_defense: 10 }, // Offensive
  { points_hp: 30, points_attack: 10, points_defense: 10 }, // Tanky
  { points_hp: 10, points_attack: 30, points_defense: 10 }, // Glass cannon
  { points_hp: 20, points_attack: 20, points_defense: 10 }, // Balanced
  { points_hp: 25, points_attack: 15, points_defense: 10 }, // Bruiser
];

router.post('/', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body?.count) || 4, 20);

    // Check how many dummies already exist
    const { data: existing } = await supabase
      .from('bots')
      .select('name')
      .eq('description', DUMMY_DESCRIPTION);

    const existingNames = new Set((existing || []).map((b: any) => b.name));
    const available = BOT_NAMES.filter(n => !existingNames.has(n));

    if (available.length === 0) {
      return res.json({ ok: true, message: 'All dummy bot names already used.', created: 0 });
    }

    const toCreate = Math.min(count, available.length);
    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < toCreate; i++) {
      const name = available[i];
      const botId = uuidv4();
      const build = STAT_BUILDS[i % STAT_BUILDS.length];
      const strategy = validateStrategy(STRATEGIES[i % STRATEGIES.length]);
      const finalStats = calculateFinalStats(build);

      try {
        const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`;

        const { error } = await supabase.from('bots').insert({
          id: botId,
          name,
          description: DUMMY_DESCRIPTION,
          avatar_url: avatarUrl,
          api_key_hash: 'dummy-no-auth',
          wallet_address: `0xDUMMY${botId.replace(/-/g, '').slice(0, 34)}`,
          status: 'ready',
          hp: finalStats.hp,
          attack: finalStats.attack,
          defense: finalStats.defense,
          elo: 0,
          wins: 0,
          total_matches: 0,
        });

        if (error) {
          errors.push(`${name}: ${error.message}`);
          continue;
        }

        // Store strategy in Redis (1 hour TTL)
        await redis.set(`strategy:${botId}`, JSON.stringify(strategy), 'EX', 3600);

        // Add to matchmaking queue
        await findMatch(botId, 0, name);

        created++;
      } catch (e) {
        errors.push(`${name}: ${(e as Error).message}`);
      }
    }

    return res.json({
      ok: true,
      message: `Created ${created} dummy agents and added to queue.`,
      created,
      existing: existingNames.size,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: (err as Error).message });
  }
});

export default router;
