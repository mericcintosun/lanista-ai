import dotenv from 'dotenv';
// Load envs from monorepo root (../../.env relative to apps/backend)
// On Railway, env vars are injected directly so dotenv silently skips if file not found
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import './src/engine/match-worker.js'; // Ensure worker started
import './src/engine/blockchain-worker.js'; // Blockchain ops queue (concurrency=1)
import { supabase } from './src/lib/supabase.js';
import { initWebSocketServer } from './src/engine/ws-server.js';
import { findMatch } from './src/engine/matchmaker.js';
import { getLootForMatch } from './src/services/loot.js';
import { redis, startMatch } from './src/routes/shared.js';

// --- Individual route modules ---
import registerRoute from './src/routes/agents/register.js';
import prepareCombatRoute from './src/routes/agents/prepare-combat.js';
import joinQueueRoute from './src/routes/agents/join-queue.js';
import agentStatusRoute from './src/routes/agents/status.js';
import agentProfileRoute from './src/routes/agents/profile.js';
import sponsorGasRoute from './src/routes/agents/sponsor-gas.js';
import claimLootRoute from './src/routes/agents/claim-loot.js';
import deleteAgentRoute from './src/routes/agents/delete.js';
import combatStartRoute from './src/routes/combat/start.js';
import combatStatusRoute from './src/routes/combat/status.js';
import combatViewerReadyRoute from './src/routes/combat/viewer-ready.js';
import hubQueueRoute from './src/routes/hub/queue.js';
import hubLiveRoute from './src/routes/hub/live.js';
import hubRecentRoute from './src/routes/hub/recent.js';
import oracleMatchesRoute from './src/routes/oracle/matches.js';
import oracleLootRoute from './src/routes/oracle/loot.js';
import leaderboardRoute from './src/routes/leaderboard.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// =============================================================================
// ROUTE MOUNTING
// =============================================================================

// Agent endpoints
app.use('/api/agents/register', registerRoute);
app.use('/api/agents/prepare-combat', prepareCombatRoute);
app.use('/api/agents/join-queue', joinQueueRoute);
app.use('/api/agents/status', agentStatusRoute);
app.use('/api/agents/sponsor-gas', sponsorGasRoute);
app.use('/api/agents', claimLootRoute);    // handles /:id/claim-loot
app.use('/api/agents', deleteAgentRoute);  // handles DELETE /:id
app.use('/api/agents', agentProfileRoute); // handles GET /:id (must be last to avoid catching other routes)

// Combat endpoints
app.use('/api/combat/start', combatStartRoute);
app.use('/api/combat/status', combatStatusRoute);
app.use('/api/combat/viewer-ready', combatViewerReadyRoute);

// Hub endpoints
app.use('/api/hub/queue', hubQueueRoute);
app.use('/api/hub/live', hubLiveRoute);
app.use('/api/hub/recent', hubRecentRoute);

// Oracle endpoints
app.use('/api/oracle/matches', oracleMatchesRoute);
app.use('/api/oracle/loot', oracleLootRoute);

// Leaderboard
app.use('/api/leaderboard', leaderboardRoute);

// =============================================================================
// STATIC ENDPOINTS
// =============================================================================

// Dummy webhook that always returns ATTACK action, used for testing
app.post('/api/dummy-webhook', (req, res) => {
  res.json({ action: 'ATTACK' });
});

// =============================================================================
// CRON JOBS
// =============================================================================

// --- LOOT SYNC POLLER ---
// Automatically updates matches where on-chain VRF is fulfilled but DB winner_loot_item_id is still null
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;
  try {
    const { data: pendingLootMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'finished')
      .not('tx_hash', 'is', null)
      .is('winner_loot_item_id', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!pendingLootMatches || pendingLootMatches.length === 0) return;

    for (const match of pendingLootMatches) {
      try {
        const loot = await getLootForMatch(match.id);
        if (loot && loot.fulfilled && Number.isFinite(loot.itemId) && loot.itemId > 0) {
          await supabase
            .from('matches')
            .update({ winner_loot_item_id: loot.itemId })
            .eq('id', match.id);
          console.log(`[LootPoller] ✅ Match ${match.id} → Item #${loot.itemId}`);
        }
      } catch { /* swallow single-match errors */ }
    }
  } catch (err: any) {
    console.error('[LootPoller] ❌', err.message);
  }
}, 30 * 1000);

// --- STALE MATCH SWEEPER ---
// Aborts matches older than 3 minutes that are still active, resets bot statuses
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;

  try {
    const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const { data: staleMatches, error: fetchErr } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'active')
      .lt('created_at', threeMinsAgo);

    if (fetchErr) throw fetchErr;

    if (staleMatches && staleMatches.length > 0) {
      const matchIds = staleMatches.map(m => m.id);
      console.log(`🧹 [Sweeper] Found ${matchIds.length} stale matches. Aborting...`);

      const { error: updateErr } = await supabase
        .from('matches')
        .update({ status: 'aborted' })
        .in('id', matchIds);

      if (updateErr) throw updateErr;

      for (const matchId of matchIds) {
        const { data: matchData } = await supabase.from('matches').select('player_1_id, player_2_id').eq('id', matchId).single();
        if (matchData) {
          await supabase.from('bots').update({ status: 'active' }).in('id', [matchData.player_1_id, matchData.player_2_id]);
        }
      }
    }
  } catch (err: any) {
    console.error("🧹 [Sweeper] Error cleaning stale matches:", err.message);
  }
}, 60 * 1000);

// --- ACTIVE MATCHMAKER POLLER ---
// Handles the "EXPANDING SEARCH RANGE" feature automatically.
// Checks the Redis pool and tries to match bots that are already waiting.
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;

  try {
    const poolAgentIds = await redis.zrange('matchmaking:pool', 0, -1);
    if (poolAgentIds.length < 2) return;

    const { data: bots } = await supabase.from('bots').select('id, elo, name').in('id', poolAgentIds);
    if (!bots || bots.length < 2) return;

    const matchedInThisCycle = new Set<string>();

    for (const bot of bots) {
      if (matchedInThisCycle.has(bot.id)) continue;

      try {
        const opponentId = await findMatch(bot.id, bot.elo || 1200, bot.name);

        if (opponentId) {
          console.log(`🤖 [AutoMatch] Found match for ${bot.name} vs ${opponentId}`);
          matchedInThisCycle.add(bot.id);
          matchedInThisCycle.add(opponentId);
          await startMatch(opponentId, bot.id);
        }
      } catch (e: any) {
        console.error(`[AutoMatch] Error matching ${bot.name}:`, e.message);
      }
    }
  } catch (err: any) {
    console.error("🤖 [AutoMatch] Sweeper error:", err.message);
  }
}, 10 * 1000);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const server = app.listen(parseInt(String(PORT)), HOST, () => {
  console.log(`Lanista Match API running on ${HOST}:${PORT}`);
});

// Attach WebSocket server to the same HTTP server
initWebSocketServer(server);
