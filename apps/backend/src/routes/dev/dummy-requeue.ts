import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';
import { calculateFinalStats } from '../../engine/referee.js';
import { validateStrategy } from '../../engine/strategy.js';
import { redis, startMatch } from '../shared.js';
import { findMatch } from '../../engine/matchmaker.js';

const router = Router();

const DUMMY_DESCRIPTION = '[arena-dummy]';

const STRATEGIES = [
  [
    { hp_above: 50, weights: { ATTACK: 40, HEAVY_ATTACK: 50, DEFEND: 5, HEAL: 5 } },
    { hp_above: 0, weights: { ATTACK: 30, HEAVY_ATTACK: 60, DEFEND: 5, HEAL: 5 } },
  ],
  [
    { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 5, DEFEND: 30, HEAL: 15 } },
    { hp_above: 30, weights: { ATTACK: 20, HEAVY_ATTACK: 0, DEFEND: 35, HEAL: 45 } },
    { hp_above: 0, weights: { ATTACK: 10, HEAVY_ATTACK: 0, DEFEND: 40, HEAL: 50 } },
  ],
  [
    { hp_above: 80, weights: { ATTACK: 30, HEAVY_ATTACK: 60, DEFEND: 5, HEAL: 5 } },
    { hp_above: 40, weights: { ATTACK: 50, HEAVY_ATTACK: 15, DEFEND: 20, HEAL: 15 } },
    { hp_above: 0, weights: { ATTACK: 70, HEAVY_ATTACK: 25, DEFEND: 0, HEAL: 5 } },
  ],
  [
    { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
    { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
    { hp_above: 0, weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } },
  ],
  [
    { hp_above: 60, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 20, HEAL: 30 } },
    { hp_above: 30, weights: { ATTACK: 20, HEAVY_ATTACK: 0, DEFEND: 30, HEAL: 50 } },
    { hp_above: 0, weights: { ATTACK: 30, HEAVY_ATTACK: 5, DEFEND: 25, HEAL: 40 } },
  ],
];

const STAT_BUILDS = [
  { points_hp: 15, points_attack: 25, points_defense: 10 },
  { points_hp: 30, points_attack: 10, points_defense: 10 },
  { points_hp: 10, points_attack: 30, points_defense: 10 },
  { points_hp: 20, points_attack: 20, points_defense: 10 },
  { points_hp: 25, points_attack: 15, points_defense: 10 },
];

router.post('/', async (req, res) => {
  try {
    // Find all dummy bots that are NOT in combat
    const { data: dummies, error: fetchErr } = await supabase
      .from('bots')
      .select('id, name, elo, status')
      .eq('description', DUMMY_DESCRIPTION)
      .neq('status', 'combat');

    if (fetchErr) throw fetchErr;

    if (!dummies || dummies.length === 0) {
      return res.json({ ok: true, message: 'No dummy agents found. Run dummy-register first.', requeued: 0 });
    }

    let requeued = 0;
    const errors: string[] = [];

    for (let i = 0; i < dummies.length; i++) {
      const bot = dummies[i];
      const build = STAT_BUILDS[i % STAT_BUILDS.length];
      const strategy = validateStrategy(STRATEGIES[i % STRATEGIES.length]);
      const finalStats = calculateFinalStats(build);

      try {
        // Update stats and set status to ready
        const { error: updateErr } = await supabase
          .from('bots')
          .update({
            hp: finalStats.hp,
            attack: finalStats.attack,
            defense: finalStats.defense,
            status: 'ready',
          })
          .eq('id', bot.id);

        if (updateErr) {
          errors.push(`${bot.name}: ${updateErr.message}`);
          continue;
        }

        // Store strategy in Redis (1 hour TTL)
        await redis.set(`strategy:${bot.id}`, JSON.stringify(strategy), 'EX', 3600);

        // Add to matchmaking queue — if matched, start the match
        const opponentId = await findMatch(bot.id, bot.elo || 0, bot.name);
        if (opponentId) {
          await startMatch(opponentId, bot.id);
        }

        requeued++;
      } catch (e) {
        errors.push(`${bot.name}: ${(e as Error).message}`);
      }
    }

    return res.json({
      ok: true,
      message: `Requeued ${requeued} of ${dummies.length} dummy agents.`,
      requeued,
      total: dummies.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: (err as Error).message });
  }
});

export default router;
