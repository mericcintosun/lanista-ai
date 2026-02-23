import dotenv from 'dotenv';
// Load envs first so they are available to all subsequent imports
dotenv.config();
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { connection } from './src/engine/match-worker.js';
import './src/engine/match-worker.js'; // Ensure worker started
import type { Bot, Match } from '@lanista/types';
import { supabase } from './src/lib/supabase.js';
import { calculateFinalStats } from './src/engine/referee.js';
import { validateStrategy, DEFAULT_STRATEGY } from './src/engine/strategy.js';
import { initWebSocketServer } from './src/engine/ws-server.js';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Queue
const matchQueue = new Queue('match-queue', { connection });

import { generateApiKey } from './src/services/auth.js';

// Serve skill.md for LLM agents to read the protocol
app.get('/skill.md', (req, res) => {
  try {
    const skillPath = resolve('../frontend/public/skill.md');
    const content = readFileSync(skillPath, 'utf-8');
    res.type('text/markdown').send(content);
  } catch {
    res.status(404).send('skill.md not found');
  }
});

app.post('/api/v1/agents/register', async (req: any, res: any) => {
  const { name, description, personality_url, webhook_url, avatar_url } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: "Missing required 'name' for the agent." });
  }

  if (!webhook_url || typeof webhook_url !== 'string') {
    return res.status(400).json({ error: "Missing required 'webhook_url' for the agent." });
  }

  try {
    const { apiKey, hash } = generateApiKey();

    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({ error: "Database not connected. Registration offline." });
    }

    const finalAvatarUrl = avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

    const { data, error } = await supabase.from('bots').insert({
      id: uuidv4(),
      name,
      description,
      personality_url,
      webhook_url,
      avatar_url: finalAvatarUrl,
      api_key_hash: hash,
      status: 'active',
      hp: 100,
      attack: 10,
      defense: 10
    }).select().single();

    if (error) {
      console.error("Agent registration error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Welcome to Lanista Arena, Agent.",
      api_key: apiKey,
      bot_id: data.id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/dummy-webhook', (req, res) => {
  // Default to ATTACK action
  const action = 'ATTACK';
  res.json({ action });
});

import { agentAuth } from './src/middleware/auth.js';

// --- POLLING ENDPOINTS ---

// Agent polls this to check if it's their turn
app.get('/api/v1/agents/my-turn', agentAuth, async (req: any, res) => {
  const agent = req.agent;

  try {
    const pending = await redis.get(`turn:pending:${agent.id}`);

    if (!pending) {
      return res.json({ pending: false, message: 'Not your turn yet. Keep polling.' });
    }

    const gameState = JSON.parse(pending);
    return res.json({ pending: true, game_state: gameState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Agent submits their action for the current turn
app.post('/api/v1/agents/submit-action', agentAuth, async (req: any, res) => {
  const agent = req.agent;
  const { match_id, action } = req.body;

  if (!match_id || !action) {
    return res.status(400).json({ error: "Missing 'match_id' and/or 'action' in body." });
  }

  const upperAction = action.toUpperCase();
  if (upperAction !== 'ATTACK' && upperAction !== 'DEFEND') {
    return res.status(400).json({ error: "Action must be 'ATTACK' or 'DEFEND'." });
  }

  try {
    // Publish the action to Redis so the match worker picks it up
    const actionChannel = `match:${match_id}:action:${agent.id}`;
    await redis.publish(actionChannel, upperAction);

    // Clear the pending turn
    await redis.del(`turn:pending:${agent.id}`);

    res.json({ success: true, message: `Action '${upperAction}' submitted.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/agents/prepare-combat', agentAuth, async (req: any, res) => {
  const { points_hp, points_attack, points_defense, strategy } = req.body;
  const agent = req.agent;

  try {
    // Referee validation for stats
    const finalStats = calculateFinalStats({
      points_hp: points_hp || 0,
      points_attack: points_attack || 0,
      points_defense: points_defense || 0
    });

    // Validate strategy (or use default)
    const validatedStrategy = strategy ? validateStrategy(strategy) : DEFAULT_STRATEGY;

    // Save stats to database
    const { error } = await supabase
      .from('bots')
      .update({
        hp: finalStats.hp,
        attack: finalStats.attack,
        defense: finalStats.defense,
        status: 'ready'
      })
      .eq('id', agent.id);

    if (error) throw error;

    // Store strategy in Redis (1 hour TTL)
    await redis.set(`strategy:${agent.id}`, JSON.stringify(validatedStrategy), 'EX', 3600);

    res.json({
      success: true,
      message: "Combat preparation successful. Stats and strategy locked.",
      stats: finalStats,
      strategy: validatedStrategy
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

import { findMatch } from './src/engine/matchmaker.js';

app.post('/api/v1/agents/join-queue', agentAuth, async (req: any, res) => {
  const agent = req.agent;

  if (agent.status !== 'ready') {
    return res.status(400).json({ error: "Agent is not ready. Call /prepare-combat first." });
  }

  try {
    // 1. Find match (async via Redis)
    const opponentId = await findMatch(agent.id);

    if (!opponentId) {
      return res.json({ status: "waiting", message: "Added to matchmaking pool. Waiting for an opponent..." });
    }

    // 2. Match found! Create match record
    const matchId = uuidv4();
    const { data: p1, error: p1Err } = await supabase.from('bots').select('*').eq('id', opponentId).single();
    const { data: p2, error: p2Err } = await supabase.from('bots').select('*').eq('id', agent.id).single();

    if (p1Err || p2Err || !p1 || !p2) {
      return res.status(500).json({ error: "Failed to fetch paired agents from database." });
    }

    const match: Match = {
      id: matchId,
      player_1_id: p1.id,
      player_2_id: p2.id,
      status: 'active',
      p1_final_stats: { hp: p1.hp, attack: p1.attack, defense: p1.defense },
      p2_final_stats: { hp: p2.hp, attack: p2.attack, defense: p2.defense }
    };

    await supabase.from('matches').insert({
      id: match.id,
      player_1_id: match.player_1_id,
      player_2_id: match.player_2_id,
      status: match.status,
      p1_final_stats: match.p1_final_stats,
      p2_final_stats: match.p2_final_stats
    });

    // Reset agent statuses to active from ready
    await supabase.from('bots').update({ status: 'active' }).in('id', [p1.id, p2.id]);

    // 3. Load strategies from Redis
    const p1StrategyRaw = await redis.get(`strategy:${p1.id}`);
    const p2StrategyRaw = await redis.get(`strategy:${p2.id}`);
    const p1Strategy = p1StrategyRaw ? JSON.parse(p1StrategyRaw) : DEFAULT_STRATEGY;
    const p2Strategy = p2StrategyRaw ? JSON.parse(p2StrategyRaw) : DEFAULT_STRATEGY;

    // 4. Add match to BullMQ queue
    await matchQueue.add('start-match', {
      matchId,
      p1: { ...p1, strategy: p1Strategy },
      p2: { ...p2, strategy: p2Strategy }
    }, {
      removeOnComplete: true,
      attempts: 3
    });

    res.json({
      status: "matched",
      matchId,
      opponent: p1.name,
      message: "The arena gates have opened!"
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Matchmaking error." });
  }
});

// --- AGENT STATUS ENDPOINT ---
app.get('/api/v1/agents/status', agentAuth, async (req: any, res) => {
  const agent = req.agent;

  try {
    // Get agent's latest match
    const { data: latestMatch, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .or(`player_1_id.eq.${agent.id},player_2_id.eq.${agent.id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get all finished matches for win/loss calculation
    const { data: allMatches, error: allMatchesErr } = await supabase
      .from('matches')
      .select('winner_id')
      .or(`player_1_id.eq.${agent.id},player_2_id.eq.${agent.id}`)
      .eq('status', 'finished');

    const totalMatches = allMatches ? allMatches.length : 0;
    const wins = allMatches ? allMatches.filter(m => m.winner_id === agent.id).length : 0;
    const losses = totalMatches - wins;

    let latestMatchStatus = "No matches played yet.";
    if (latestMatch) {
      if (latestMatch.status === 'active') {
        latestMatchStatus = "Currently in an active match.";
      } else if (latestMatch.status === 'finished') {
        const isWinner = latestMatch.winner_id === agent.id;
        const opponentId = latestMatch.player_1_id === agent.id ? latestMatch.player_2_id : latestMatch.player_1_id;

        // Fetch opponent name
        const { data: opponent } = await supabase.from('bots').select('name').eq('id', opponentId).single();
        const opponentName = opponent ? opponent.name : 'Unknown';

        latestMatchStatus = isWinner
          ? `Won against ${opponentName} in match ${latestMatch.id}`
          : `Lost against ${opponentName} in match ${latestMatch.id}`;
      }
    }

    res.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status
      },
      stats: {
        total_matches: totalMatches,
        wins: wins,
        losses: losses,
        win_rate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) + '%' : '0%'
      },
      latest_match: latestMatchStatus
    });

  } catch (err: any) {
    res.status(500).json({ success: false, error: "Failed to fetch agent status." });
  }
});

app.post('/api/combat/start', async (req, res) => {
  const matchId = uuidv4();

  // Backend requires stat distribution from agent
  const p1Dist = req.body?.p1_dist;
  const p2Dist = req.body?.p2_dist;
  const player1Id = req.body?.player_1_id;
  const player2Id = req.body?.player_2_id;

  if (!p1Dist || !p2Dist || !player1Id || !player2Id) {
    return res.status(400).json({ error: "Missing required fields. Expected 'p1_dist', 'p2_dist', 'player_1_id', and 'player_2_id' in JSON body." });
  }

  try {
    const p1Stats = calculateFinalStats(p1Dist);
    const p2Stats = calculateFinalStats(p2Dist);

    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({ error: "Database not connected. Cannot start combat." });
    }

    const { data: dbP1, error: p1Err } = await supabase.from('bots').select('*').eq('id', player1Id).single();
    const { data: dbP2, error: p2Err } = await supabase.from('bots').select('*').eq('id', player2Id).single();

    if (p1Err || p2Err || !dbP1 || !dbP2) {
      return res.status(404).json({ error: "One or both bots not found in database." });
    }

    // Apply calculated stats to bots
    const p1 = { ...dbP1, hp: p1Stats.hp, current_hp: p1Stats.hp, attack: p1Stats.attack, defense: p1Stats.defense };
    const p2 = { ...dbP2, hp: p2Stats.hp, current_hp: p2Stats.hp, attack: p2Stats.attack, defense: p2Stats.defense };

    // Create match object
    const match: Match = {
      id: matchId,
      player_1_id: p1.id,
      player_2_id: p2.id,
      status: 'active',
      p1_final_stats: p1Stats,
      p2_final_stats: p2Stats
    };

    const { error: mErr } = await supabase.from('matches').insert({
      id: match.id,
      player_1_id: match.player_1_id,
      player_2_id: match.player_2_id,
      status: match.status,
      p1_final_stats: match.p1_final_stats,
      p2_final_stats: match.p2_final_stats
    });
    if (mErr) {
      console.error('Match Insert Error:', mErr);
      return res.status(500).json({ error: "Failed to create match" });
    }

    // Add the match job to BullMQ queue
    await matchQueue.add('start-match', {
      matchId,
      p1,
      p2
    });

    console.log(`Added Match ${matchId} to Queue`);

    res.json({ message: 'Agents armed, battle starting!', match });
  } catch (err: any) {
    console.error('Combat constraint error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/combat/status', async (req, res) => {
  const { matchId } = req.query;

  if (!matchId || typeof matchId !== 'string') {
    return res.status(400).json({ error: "matchId is required" });
  }

  try {
    const { data: match, error: mErr } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(*), player_2:bots!matches_player_2_id_fkey(*)')
      .eq('id', matchId)
      .single();

    if (mErr || !match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const { data: logs, error: lErr } = await supabase.from('combat_logs')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    res.json({ match, logs: logs || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- HUB / DASHBOARD ANALYTICS ENDPOINTS ---

app.get('/api/v1/hub/queue', async (req, res) => {
  try {
    // We check redis directly if anyone is waiting
    const waitingAgentId = await redis.get('matchmaking:waiting_agent');
    if (waitingAgentId) {
      const { data: bot } = await supabase.from('bots').select('id, name, avatar_url').eq('id', waitingAgentId).single();
      return res.json({ queue: bot ? [bot] : [] });
    }
    return res.json({ queue: [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch queue" });
  }
});

app.get('/api/v1/hub/live', async (req, res) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(id, name, avatar_url), player_2:bots!matches_player_2_id_fkey(id, name, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    res.json({ matches: matches || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/hub/recent', async (req, res) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(id, name, avatar_url), player_2:bots!matches_player_2_id_fkey(id, name, avatar_url)')
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ matches: matches || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- HALL OF FAME ENDPOINTS ---

app.get('/api/v1/leaderboard', async (req, res) => {
  // Using a simplified counting approach due to lack of complex SQL RPC for now
  try {
    // 1. Fetch bots
    const { data: bots, error: botErr } = await supabase.from('bots').select('id, name, avatar_url, description');
    if (botErr) throw botErr;

    // 2. Fetch all finished matches to aggregate wins manually (in-memory for simple demo)
    const { data: matches, error: matchErr } = await supabase.from('matches').select('winner_id, player_1_id, player_2_id').eq('status', 'finished');
    if (matchErr) throw matchErr;

    if (!bots || !matches) return res.json({ leaderboard: [] });

    const statsMap: Record<string, { id: string, name: string, avatar_url: string, wins: number, totalMatches: number }> = {};

    bots.forEach(b => {
      statsMap[b.id] = { id: b.id, name: b.name, avatar_url: b.avatar_url, wins: 0, totalMatches: 0 };
    });

    matches.forEach(m => {
      if (statsMap[m.player_1_id]) statsMap[m.player_1_id].totalMatches++;
      if (statsMap[m.player_2_id]) statsMap[m.player_2_id].totalMatches++;
      if (m.winner_id && statsMap[m.winner_id]) {
        statsMap[m.winner_id].wins++;
      }
    });

    const leaderboard = Object.values(statsMap)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 50); // Top 50

    res.json({ leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/agent/:id', async (req, res) => {
  try {
    const { data: bot, error: botErr } = await supabase.from('bots').select('*').eq('id', req.params.id).single();
    if (botErr || !bot) return res.status(404).json({ error: "Agent not found" });

    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(name, avatar_url), player_2:bots!matches_player_2_id_fkey(name, avatar_url)')
      .or(`player_1_id.eq.${bot.id},player_2_id.eq.${bot.id}`)
      .order('created_at', { ascending: false });

    if (matchErr) throw matchErr;

    res.json({ agent: bot, history: matches || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ORACLE ENDPOINTS ---

// Tamamlanmış tüm maçları on-chain TX bilgileriyle birlikte getirir
app.get('/api/v1/oracle/matches', async (req, res) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id, tx_hash, created_at, winner_id, player_1_id, player_2_id,
        player_1:bots!matches_player_1_id_fkey(name, avatar_url, wallet_address),
        player_2:bots!matches_player_2_id_fkey(name, avatar_url, wallet_address)
      `)
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ matches: matches || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/oracle/verify', async (req, res) => {
  res.status(410).json({ valid: false, error: "Deprecated. Check /api/v1/oracle/matches for on-chain records." });
});

// --- STALE MATCH SWEEPER (CRON) ---
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;

  try {
    // Abort matches older than 3 minutes that are still active
    const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    // Simple approach:
    // Select stale IDs then update them
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
    }
  } catch (err: any) {
    console.error("🧹 [Sweeper] Error cleaning stale matches:", err.message);
  }
}, 60 * 1000); // Check every 1 minute

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Lanista Match API running on port ${PORT}`);
});

// Attach WebSocket server to the same HTTP server
initWebSocketServer(server);
