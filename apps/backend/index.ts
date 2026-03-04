import dotenv from 'dotenv';
import WDK from '@tetherto/wdk';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Load envs first so they are available to all subsequent imports
dotenv.config();
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { connection } from './src/engine/match-worker.js';
import './src/engine/match-worker.js'; // Ensure worker started
import './src/engine/blockchain-worker.js'; // Blockchain ops queue (concurrency=1)
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
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());

function respondError(res: express.Response, status: number, clientMessage: string, err?: unknown): void {
  if (err !== undefined) console.error(clientMessage, err);
  res.status(status).json({ error: clientMessage });
}

// Initialize Queue
const matchQueue = new Queue('match-queue', { connection });

import { generateApiKey } from './src/services/auth.js';
import { encrypt } from './src/services/crypto.js';
import { ethers } from 'ethers';
import { getLootForMatch } from './src/services/loot.js';
import { sponsorGas } from './src/services/gas-station.js';

app.post('/api/v1/agents/sponsor-gas', sponsorGas);

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

    const seedPhrase = WDK.getRandomSeedPhrase();
    const encryptedPrivateKey = encrypt(seedPhrase);

    // WDK ile cüzdan adresini oluştur
    const wdk = new WDK(seedPhrase);
    wdk.registerWallet('evm', WalletManagerEvm as any, { rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc', chainId: 43114 } as any);
    const evmAccount = await wdk.getAccount('evm');
    const walletAddress = (evmAccount as any)._account.address || (evmAccount as any).address;

    // Eğer isim belirtilmemişse veya özel bayrak gönderilmişse wallet'tan isim üret
    const botName = name === 'DUMMY_WALLET_NAME' ? walletAddress.slice(2, 6).toLowerCase() : name;

    const finalAvatarUrl = avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(botName)}`;

    const { data, error } = await supabase.from('bots').insert({
      id: uuidv4(),
      name: botName,
      description,
      personality_url,
      webhook_url,
      avatar_url: finalAvatarUrl,
      api_key_hash: hash,
      wallet_address: walletAddress,
      encrypted_private_key: encryptedPrivateKey,
      status: 'active',
      hp: 100,
      attack: 10,
      defense: 10
    }).select().single();

    if (error) {
      console.error("Agent registration error:", error);
      return res.status(400).json({ error: "Registration failed. Check your input." });
    }

    res.json({
      message: "Welcome to Lanista Arena, Agent.",
      api_key: apiKey,
      bot_id: data.id,
      wallet_address: walletAddress
    });
  } catch (err: any) {
    respondError(res, 500, "Registration failed.", err);
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
    respondError(res, 500, "Failed to check turn status.", err);
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
    respondError(res, 500, "Failed to submit action.", err);
  }
});

app.post('/api/v1/agents/prepare-combat', agentAuth, async (req: any, res) => {
  const { points_hp, points_attack, points_defense, strategy } = req.body;
  const agent = req.agent;

  if (agent.status === 'combat') {
    return res.status(400).json({ 
      success: false, 
      error: "Protocol violation: Cannot re-calibrate systems while in active combat telemetry." 
    });
  }

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
    console.error("Combat preparation failed.", err);
    res.status(400).json({ success: false, error: "Combat preparation failed. Check stats and strategy." });
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
    const opponentId = await findMatch(agent.id, agent.elo, agent.name);

    if (!opponentId) {
      return res.json({ status: "waiting", message: "Added to matchmaking pool. Waiting for an opponent..." });
    }

    const matchInfo = await startMatch(opponentId, agent.id);
    
    res.json({
      status: "matched",
      matchId: matchInfo.matchId,
      opponent: matchInfo.opponentName,
      message: "The arena gates have opened!"
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Matchmaking error." });
  }
});

/**
 * startMatch: Core logic to initialize a match between two bots.
 * Used by both the join-queue API and the background matchmaking sweeper.
 */
async function startMatch(p1Id: string, p2Id: string) {
  const matchId = uuidv4();
  const { data: p1, error: p1Err } = await supabase.from('bots').select('*').eq('id', p1Id).single();
  const { data: p2, error: p2Err } = await supabase.from('bots').select('*').eq('id', p2Id).single();

  if (p1Err || p2Err || !p1 || !p2) {
    throw new Error("Failed to fetch paired agents from database.");
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

  // Set agent statuses to combat to prevent double entry
  await supabase.from('bots').update({ status: 'combat' }).in('id', [p1.id, p2.id]);

  // Load strategies from Redis
  const p1StrategyRaw = await redis.get(`strategy:${p1.id}`);
  const p2StrategyRaw = await redis.get(`strategy:${p2.id}`);
  const p1Strategy = p1StrategyRaw ? JSON.parse(p1StrategyRaw) : DEFAULT_STRATEGY;
  const p2Strategy = p2StrategyRaw ? JSON.parse(p2StrategyRaw) : DEFAULT_STRATEGY;

  // Add match to BullMQ queue
  await matchQueue.add('start-match', {
    matchId,
    p1: { ...p1, strategy: p1Strategy },
    p2: { ...p2, strategy: p2Strategy }
  }, {
    removeOnComplete: true,
    attempts: 3
  });

  return { matchId, opponentName: p1.name };
}

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
    respondError(res, 400, "Failed to start combat. Check request body.", err);
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

    const { data: logs } = await supabase.from('combat_logs')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (match.player_1) {
      match.player_1.current_hp = match.p1_current_hp ?? match.player_1.hp;
    }
    if (match.player_2) {
      match.player_2.current_hp = match.p2_current_hp ?? match.player_2.hp;
    }

    res.json({ match, logs: logs || [] });
  } catch (error: any) {
    respondError(res, 500, "Failed to fetch match status.", error);
  }
});

// --- HUB / DASHBOARD ANALYTICS ENDPOINTS ---

app.get('/api/v1/hub/queue', async (req, res) => {
  try {
    // 1. Get all waiting agent IDs from the Redis ZSET pool
    const poolAgentIds = await redis.zrange('matchmaking:pool', 0, -1);
    
    if (poolAgentIds.length === 0) {
      return res.json({ queue: [] });
    }

    // 2. Fetch bot identity details from Supabase
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, name, avatar_url')
      .in('id', poolAgentIds);

    if (error || !bots) throw error || new Error("Bots not found");

    const now = Math.floor(Date.now() / 1000);

    // 3. Attach wait-time based status to each bot
    const queueWithStatus = await Promise.all(bots.map(async (bot) => {
      const entryTime = await redis.hget('matchmaking:entry_times', bot.id);
      const waitTime = entryTime ? now - parseInt(entryTime) : 0;
      
      return {
        ...bot,
        waitTime,
        status: waitTime > 30 
          ? "Expanding search range... (Looking for balanced opponent)" 
          : "Ready"
      };
    }));

    return res.json({ queue: queueWithStatus });
  } catch (error) {
    console.error("Hub queue fetch error:", error);
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
    respondError(res, 500, "Failed to fetch live matches.", error);
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
    respondError(res, 500, "Failed to fetch recent matches.", error);
  }
});

// --- HALL OF FAME ENDPOINTS ---

app.get('/api/v1/leaderboard', async (req, res) => {
  try {
    // Her bot için ELO'ya göre sıralı liste
    const { data: bots, error: botErr } = await supabase
      .from('bots')
      .select('id, name, avatar_url, description, elo, total_matches')
      .order('elo', { ascending: false })
      .limit(50);

    if (botErr) throw botErr;
    if (!bots) return res.json({ leaderboard: [] });

    const botIds = bots.map(b => b.id);

    // Fetch all finished matches via pagination to compute accurate stats without getting truncated at 1000
    let allMatches: any[] = [];
    let page = 0;
    while (true) {
      const { data: matchPage, error: matchErr } = await supabase
        .from('matches')
        .select('winner_id, player_1_id, player_2_id')
        .eq('status', 'finished')
        .range(page * 1000, (page + 1) * 1000 - 1);
        
      if (matchErr) throw matchErr;
      if (!matchPage || matchPage.length === 0) break;
      allMatches.push(...matchPage);
      if (matchPage.length < 1000) break;
      page++;
    }

    // Her bot için wins ve totalMatches say
    const winsMap: Record<string, number> = {};
    const totalMap: Record<string, number> = {};

    (allMatches || []).forEach(m => {
      if (m.player_1_id) totalMap[m.player_1_id] = (totalMap[m.player_1_id] || 0) + 1;
      if (m.player_2_id) totalMap[m.player_2_id] = (totalMap[m.player_2_id] || 0) + 1;
      if (m.winner_id)   winsMap[m.winner_id]     = (winsMap[m.winner_id]     || 0) + 1;
    });

    const leaderboard = bots.map(b => {
      const totalMatches = totalMap[b.id] ?? 0;
      const wins         = winsMap[b.id]  ?? 0;
      const elo          = b.elo          ?? 0;
      const winRate      = totalMatches > 0 ? wins / totalMatches : 0;
      
      // LOGIC FIX: Negatif win rate'e sahip botların, pozitif botları geçmesini önlemek için
      // sıralamada kullanılacak efektif bir ELO hesaplıyoruz (sadece sıralamayı etkiler ELO'yu düşürmez)
      const effectiveElo = winRate < 0.5 && totalMatches > 0 ? elo * (winRate / 0.5) : elo;

      return { id: b.id, name: b.name, avatar_url: b.avatar_url, description: b.description,
               elo, effectiveElo, totalMatches, wins, winRate };
    })
    .sort((a, b) => {
      // 1. Hiç oynamamışlar en sona
      const aPlayed = a.totalMatches > 0 ? 1 : 0;
      const bPlayed = b.totalMatches > 0 ? 1 : 0;
      if (bPlayed !== aPlayed) return bPlayed - aPlayed;

      // 2. Win rate'i %50 altında olanları sert cezalandıran Efektif ELO'ya göre sırala
      if (Math.abs(b.effectiveElo - a.effectiveElo) > 5) return b.effectiveElo - a.effectiveElo;

      // 3. ELO yakınsa: ELO, Net Kazanım, Sonra Total Matches
      if (b.elo !== a.elo) return b.elo - a.elo;
      const netA = a.wins - (a.totalMatches - a.wins);
      const netB = b.wins - (b.totalMatches - b.wins);
      if (netA !== netB)             return netB - netA;
      if (b.winRate !== a.winRate)   return b.winRate - a.winRate;
      return b.totalMatches - a.totalMatches;
    });

    res.json({ leaderboard });

  } catch (error: any) {
    respondError(res, 500, "Failed to fetch leaderboard.", error);
  }
});



app.get('/api/v1/agent/:id', async (req, res) => {
  try {
    const { data: bot, error: botErr } = await supabase.from('bots').select('*').eq('id', req.params.id).single();
    if (botErr || !bot) return res.status(404).json({ error: "Agent not found" });

    // Calculate absolute stats for this agent by fetching lightweight match logs
    // We fetch EVERYTHING for this agent just like HoF does! (but only for this agent)
    let allFinished: any[] = [];
    let page = 0;
    while (true) {
      const { data: mPage, error: mErr } = await supabase
        .from('matches')
        .select('winner_id')
        .eq('status', 'finished')
        .or(`player_1_id.eq.${bot.id},player_2_id.eq.${bot.id}`)
        .range(page * 1000, (page + 1) * 1000 - 1);
        
      if (mErr) throw mErr;
      if (!mPage || mPage.length === 0) break;
      allFinished.push(...mPage);
      if (mPage.length < 1000) break;
      page++;
    }

    const wins = allFinished.filter(m => m.winner_id === bot.id).length;
    const totalMatches = allFinished.length;

    // Attach exact true stats to the bot object response
    bot.true_wins = wins;
    bot.true_total_matches = totalMatches;

    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(name, avatar_url), player_2:bots!matches_player_2_id_fkey(name, avatar_url)')
      .or(`player_1_id.eq.${bot.id},player_2_id.eq.${bot.id}`)
      .order('created_at', { ascending: false })
      .limit(50); // ONLY top 50 matches for the UI history list!

    if (matchErr) throw matchErr;

    res.json({ agent: bot, history: matches || [] });
  } catch (error: any) {
    respondError(res, 500, "Failed to fetch agent.", error);
  }
});

// --- ORACLE ENDPOINTS ---

// Tamamlanmış tüm maçları on-chain TX bilgileriyle birlikte getirir
app.get('/api/v1/oracle/matches', async (req, res) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id, tx_hash, created_at, winner_id, player_1_id, player_2_id, winner_loot_item_id,
        player_1:bots!matches_player_1_id_fkey(name, avatar_url, wallet_address),
        player_2:bots!matches_player_2_id_fkey(name, avatar_url, wallet_address)
      `)
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ matches: matches || [] });
  } catch (error: any) {
    respondError(res, 500, "Failed to fetch oracle matches.", error);
  }
});

app.get('/api/v1/oracle/loot/:matchId', async (req, res) => {
  const { matchId } = req.params;

  if (!matchId) {
    return res.status(400).json({ error: "matchId is required" });
  }

  try {
    const loot = await getLootForMatch(matchId);
    if (!loot) {
      return res.json({ found: false });
    }
    // Persist fulfilled loot into matches table for analytics / fast reads
    if (loot.fulfilled && Number.isFinite(loot.itemId)) {
      try {
        await supabase
          .from('matches')
          .update({ winner_loot_item_id: loot.itemId })
          .eq('id', matchId);
      } catch (e) {
        console.warn('[Loot] Failed to persist winner_loot_item_id to matches:', (e as any)?.message || e);
      }
    }
    return res.json({ found: true, loot });
  } catch (error: any) {
    respondError(res, 500, "Failed to fetch loot for match.", error);
  }
});

import { claimLootWithWDK } from './src/services/loot-claim.js';

app.post('/api/v1/agents/:id/claim-loot', async (req: any, res: any) => {
  const { id } = req.params;
  const { matchId } = req.body;

  if (!id || !matchId) {
    return res.status(400).json({ error: "botId (id) and matchId are required" });
  }

  try {
    const txHash = await claimLootWithWDK(id, matchId);
    if (!txHash) {
      return res.status(400).json({ error: "Claim failed. Check bot balance or loot status." });
    }
    res.json({ success: true, txHash });
  } catch (err: any) {
    respondError(res, 500, "Loot claim error.", err);
  }
});

app.get('/api/v1/oracle/verify', async (req, res) => {
  res.status(410).json({ valid: false, error: "Deprecated. Check /api/v1/oracle/matches for on-chain records." });
});

// --- LOOT SYNC POLLER (CRON) ---
// On-chain VRF fulfill olan ama DB'de winner_loot_item_id'si null olan maçları otomatik günceller
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;
  try {
    const { data: pendingLootMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'finished')
      .not('tx_hash', 'is', null)
      .is('winner_loot_item_id', null)
      .order('created_at', { ascending: false })  // Yeni maçları önce kontrol et
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
      } catch { /* tek maç hatasını yut */ }
    }
  } catch (err: any) {
    console.error('[LootPoller] ❌', err.message);
  }
}, 30 * 1000);

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

      // Also reset bot statuses back to active so they can compete again
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
}, 60 * 1000); // Check every 1 minute

// --- ACTIVE MATCHMAKER POLLER (CRON) ---
// This handles the "EXPANDING SEARCH RANGE" feature automatically.
// It checks the Redis pool and tries to match bots that are already waiting.
setInterval(async () => {
  if (!process.env.SUPABASE_URL) return;

  try {
    // 1. Get all agents in the pool
    const poolAgentIds = await redis.zrange('matchmaking:pool', 0, -1);
    if (poolAgentIds.length < 2) return; // Need at least two to match

    // 2. Fetch their ELOs and Names from DB (to supply to findMatch)
    const { data: bots } = await supabase.from('bots').select('id, elo, name').in('id', poolAgentIds);
    if (!bots || bots.length < 2) return;

    // 3. Iterate and try to match
    // We use a set to keep track of who got matched in this cycle to avoid double-matching the same bot twice in one loop
    const matchedInThisCycle = new Set<string>();

    for (const bot of bots) {
      if (matchedInThisCycle.has(bot.id)) continue;

      try {
        // Try to find a match for this bot
        const opponentId = await findMatch(bot.id, bot.elo || 1200, bot.name);
        
        if (opponentId) {
          console.log(`🤖 [AutoMatch] Found match for ${bot.name} vs ${opponentId}`);
          
          matchedInThisCycle.add(bot.id);
          matchedInThisCycle.add(opponentId);

          // Initialize the match
          await startMatch(opponentId, bot.id);
        }
      } catch (e: any) {
        console.error(`[AutoMatch] Error matching ${bot.name}:`, e.message);
      }
    }
  } catch (err: any) {
    console.error("🤖 [AutoMatch] Sweeper error:", err.message);
  }
}, 10 * 1000); // Check every 10 seconds

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const server = app.listen(parseInt(String(PORT)), HOST, () => {
  console.log(`Lanista Match API running on ${HOST}:${PORT}`);
});

// Attach WebSocket server to the same HTTP server
initWebSocketServer(server);
