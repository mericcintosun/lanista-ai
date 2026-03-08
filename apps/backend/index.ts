import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load envs from monorepo root so it works regardless of cwd (e.g. "npm run dev" from root vs apps/backend)
const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import './src/engine/match-worker.js'; // Ensure worker started
import './src/engine/blockchain-worker.js'; // Blockchain ops queue (concurrency=1)
import { supabase } from './src/lib/supabase.js';
import { initWebSocketServer } from './src/engine/ws-server.js';
import { findMatch } from './src/engine/matchmaker.js';
import { getLootForMatch } from './src/services/loot.js';
import { getRankUpLootResult } from './src/services/rankUpLoot.js';
import { getPassportByBotWallet, updateReputationOnChain } from './src/services/passport.js';
import { redis, startMatch } from './src/routes/shared.js';

// --- Individual route modules ---
import registerRoute from './src/routes/agents/register.js';
import prepareCombatRoute from './src/routes/agents/prepare-combat.js';
import joinQueueRoute from './src/routes/agents/join-queue.js';
import agentStatusRoute from './src/routes/agents/status.js';
import agentProfileRoute from './src/routes/agents/profile.js';
import sponsorGasRoute from './src/routes/agents/sponsor-gas.js';
import claimLootRoute from './src/routes/agents/claim-loot.js';
import claimRewardRoute from './src/routes/agents/claim-reward.js';
import deleteAgentRoute from './src/routes/agents/delete.js';
import combatStartRoute from './src/routes/combat/start.js';
import combatStatusRoute from './src/routes/combat/status.js';
import combatViewerReadyRoute from './src/routes/combat/viewer-ready.js';
import hubQueueRoute from './src/routes/hub/queue.js';
import hubLiveRoute from './src/routes/hub/live.js';
import hubRecentRoute from './src/routes/hub/recent.js';
import dummyRegisterRoute from './src/routes/dev/dummy-register.js';
import dummyRequeueRoute from './src/routes/dev/dummy-requeue.js';
import oracleMatchesRoute from './src/routes/oracle/matches.js';
import oracleLootRoute from './src/routes/oracle/loot.js';
import oracleRankUpStatusRoute from './src/routes/oracle/rank-up-status.js';
import oracleInventoryRoute from './src/routes/oracle/inventory.js';
import oracleRecentLootDropsRoute from './src/routes/oracle/recent-loot-drops.js';
import leaderboardRoute from './src/routes/leaderboard.js';
import userProfileRoute from './src/routes/user-profile.js';
import userBindRoute from './src/routes/user-bind.js';
import sparksRoute from './src/routes/sparks/index.js';
import passportMetadataRoute from './src/routes/nft/passport-metadata.js';
import passportImageRoute from './src/routes/nft/passport-image.js';
import { startSparkEventListener } from './src/engine/spark-event-listener.js';

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = corsOrigin === '*'
  ? '*'
  : corsOrigin.split(',').map(s => s.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: corsOrigin !== '*' // Wildcard origins don't allow credentials
}));
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
app.use('/api/agents', claimRewardRoute);  // handles POST /:id/claim-reward
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

// Dev: dummy scripts (spawn-dummy / spawn-dummy-requeue)
app.use('/api/dev/dummy-register', dummyRegisterRoute);
app.use('/api/dev/dummy-requeue', dummyRequeueRoute);

// Oracle endpoints
app.use('/api/oracle/matches', oracleMatchesRoute);
app.use('/api/oracle/loot', oracleLootRoute);
app.use('/api/oracle/rank-up-status', oracleRankUpStatusRoute);
app.use('/api/oracle/inventory', oracleInventoryRoute);
app.use('/api/oracle/recent-loot-drops', oracleRecentLootDropsRoute);

// Leaderboard
app.use('/api/leaderboard', leaderboardRoute);

// NFT passport (metadata + image for ERC-721)
app.use('/api/nft/passport-metadata', passportMetadataRoute);
app.use('/api/nft/passport-image', passportImageRoute);

// User Profile
app.use('/api/user/profile', userProfileRoute);
app.use('/api/user/bind', userBindRoute);

// Spark economy
app.use('/api/sparks', sparksRoute);

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

// --- LOOT SYNC POLLER (legacy LootChest) ---
// Only runs when RankUpLootNFT is NOT used. With RankUpLootNFT, loot is rank-up only.
if (!process.env.RANK_UP_LOOT_NFT_ADDRESS) {
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
}

// --- RANK-UP NFT POLLER (RankUpLootNFT / new Chainlink contract) ---
// Syncs winner_loot_item_id from rank_up_loot_requests when VRF is fulfilled.
// Only polls pending requests (fulfilled_at IS NULL) to avoid redundant RPC calls.
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;
  try {
    const { data: requests } = await supabase
      .from('rank_up_loot_requests')
      .select('id, match_id, request_id')
      .not('request_id', 'is', null)
      .is('fulfilled_at', null);

    if (!requests || requests.length === 0) return;

    for (const row of requests) {
      try {
        const result = await getRankUpLootResult(row.request_id);
        if (result?.fulfilled && Number.isFinite(result.itemId) && result.itemId > 0) {
          const { error: matchError } = await supabase
            .from('matches')
            .update({ winner_loot_item_id: result.itemId })
            .eq('id', row.match_id);

          const { error: reqError } = await supabase
            .from('rank_up_loot_requests')
            .update({ fulfilled_at: new Date().toISOString(), item_id: result.itemId })
            .eq('id', row.id);

          if (!matchError) {
            console.log(`[RankUpLootPoller] ✅ Match ${row.match_id} → Item #${result.itemId}`);
          }
          if (reqError) {
            console.warn('[RankUpLootPoller] Failed to update rank_up_loot_requests:', reqError.message);
          }
        }
      } catch { /* swallow single-request errors */ }
    }
  } catch (err: any) {
    console.error('[RankUpLootPoller] ❌', err.message);
  }
}, 30 * 1000);

// --- PASSPORT REPUTATION SYNC (ERC-8004) ---
// DB → chain: fixes drift when updateReputationOnChain failed after a match. Idempotent; skips in-sync bots.
const PASSPORT_SYNC_INTERVAL_MS = Number(process.env.PASSPORT_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1000; // default 6h
setInterval(async () => {
  if (!process.env.SUPABASE_URL || !process.env.AGENT_PASSPORT_CONTRACT_ADDRESS) return;
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, wallet_address, reputation_score, total_matches, wins')
      .not('wallet_address', 'is', null);
    if (error || !bots?.length) return;

    let synced = 0;
    for (const bot of bots) {
      const wallet = (bot.wallet_address || '').trim();
      if (!wallet || wallet.length < 40) continue;

      const passport = await getPassportByBotWallet(wallet);
      if (!passport) continue;

      const rep = Number(bot.reputation_score) ?? 100;
      const total = Math.max(0, Math.min(0xffff_ffff, Number(bot.total_matches) ?? 0));
      const winsCount = Math.max(0, Math.min(0xffff_ffff, Number(bot.wins) ?? 0));
      if (passport.totalMatches === total && passport.wins === winsCount && passport.reputationScore === rep) continue;

      const ok = await updateReputationOnChain(wallet, rep, total, winsCount);
      if (ok) synced++;
    }
    if (synced > 0) console.log(`[PassportSync] ✅ ${synced} passport(s) synced to chain`);
  } catch (err: any) {
    console.error('[PassportSync] ❌', err?.message ?? err);
  }
}, PASSPORT_SYNC_INTERVAL_MS);

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

// Spark purchase event listener (polls SparkTreasury.SparksPurchased and credits spark_balances)
startSparkEventListener();
