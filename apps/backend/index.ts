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
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Queue
const matchQueue = new Queue('match-queue', { connection });

import { generateApiKey } from './src/services/auth.js';

app.post('/api/v1/agents/register', async (req, res) => {
  const { name, description, personality_url } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: "Missing required 'name' for the agent." });
  }

  try {
    const { apiKey, hash } = generateApiKey();

    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({ error: "Database not connected. Registration offline." });
    }

    const { data, error } = await supabase.from('bots').insert({
      id: uuidv4(),
      name,
      description,
      personality_url,
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

import { agentAuth } from './src/middleware/auth.js';

app.post('/api/v1/agents/prepare-combat', agentAuth, async (req: any, res) => {
  const { points_hp, points_attack, points_defense } = req.body;
  const agent = req.agent; // Middleware'den gelen bot bilgisi

  try {
    // Hakem kontrolü
    const finalStats = calculateFinalStats({
      points_hp: points_hp || 0,
      points_attack: points_attack || 0,
      points_defense: points_defense || 0
    });

    // Hazırlanan statları ajanın veritabanı satırına "anlık stat" olarak kaydedelim
    const { error } = await supabase
      .from('bots')
      .update({
        current_battle_stats: finalStats,
        status: 'ready'
      })
      .eq('id', agent.id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Combat preparation successful. Stats locked.",
      stats: finalStats
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
    // 1. Eşleşme ara (Redis üzerinden asenkron)
    const opponentId = await findMatch(agent.id);

    if (!opponentId) {
      return res.json({ status: "waiting", message: "Matchmaking havuzuna eklendin. Rakip bekleniyor..." });
    }

    // 2. Eşleşme bulundu! Supabase'de maç kaydı oluştur
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
      p1_final_stats: p1.current_battle_stats,
      p2_final_stats: p2.current_battle_stats
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

    activeMatch = match;

    // 3. Maçı BullMQ kuyruğuna fırlat
    await matchQueue.add('start-match', {
      matchId,
      p1: { ...p1, ...p1.current_battle_stats },
      p2: { ...p2, ...p2.current_battle_stats }
    }, {
      removeOnComplete: true, // Tamamlanan maçları Redis'ten temizle (Ölçeklenebilirlik için kritik)
      attempts: 3
    });

    res.json({
      status: "matched",
      matchId,
      opponent: p1.name,
      message: "Arena kapıları açıldı!"
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Matchmaking hatası." });
  }
});

// Mock / Default Bots
const mockP1: Bot = {
  id: uuidv4(),
  name: 'Openclaw Alpha',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alpha',
  hp: 1000,
  current_hp: 1000,
  attack: 150,
  defense: 50,
};

const mockP2: Bot = {
  id: uuidv4(),
  name: 'Kite Protocol',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kite',
  hp: 1200,
  current_hp: 1200,
  attack: 120,
  defense: 80,
};

// In-memory fallback if no DB
let activeMatch: Match | null = null;

app.post('/api/combat/start', async (req, res) => {
  const matchId = uuidv4();

  // Backend artık ajandan gelen kararı zorunlu kılıyor
  const p1Dist = req.body?.p1_dist;
  const p2Dist = req.body?.p2_dist;

  if (!p1Dist || !p2Dist) {
    return res.status(400).json({ error: "Missing stat distributions for one or both agents. Expected 'p1_dist' and 'p2_dist' in JSON body." });
  }

  try {
    const p1Stats = calculateFinalStats(p1Dist);
    const p2Stats = calculateFinalStats(p2Dist);

    // Apply calculated stats to bots
    const p1 = { ...mockP1, id: uuidv4(), hp: p1Stats.hp, current_hp: p1Stats.hp, attack: p1Stats.attack, defense: p1Stats.defense };
    const p2 = { ...mockP2, id: uuidv4(), hp: p2Stats.hp, current_hp: p2Stats.hp, attack: p2Stats.attack, defense: p2Stats.defense };

    // Create match object
    const match: Match = {
      id: matchId,
      player_1_id: p1.id,
      player_2_id: p2.id,
      player_1: p1,
      player_2: p2,
      status: 'active',
      created_at: new Date().toISOString()
    };

    // Optionally create in DB
    if (process.env.SUPABASE_URL) {
      // First ensure bots exist or create them with correct DB schema columns
      // Including the original base stats as default logic since they distribute stats over them
      const dbP1 = { id: p1.id, name: p1.name, hp: p1Stats.hp, attack: p1Stats.attack, defense: p1Stats.defense };
      const dbP2 = { id: p2.id, name: p2.name, hp: p2Stats.hp, attack: p2Stats.attack, defense: p2Stats.defense };

      const { error: bErr } = await supabase.from('bots').upsert([dbP1, dbP2]);
      if (bErr) console.error('Bot Upsert Error:', bErr);

      const { error: mErr } = await supabase.from('matches').insert({
        id: match.id,
        player_1_id: match.player_1_id,
        player_2_id: match.player_2_id,
        status: match.status,
        p1_final_stats: p1Stats,
        p2_final_stats: p2Stats
      });
      if (mErr) console.error('Match Insert Error:', mErr);
    }

    activeMatch = match;

    // Add the match job to BullMQ queue
    await matchQueue.add('start-match', {
      matchId,
      p1,
      p2
    });

    console.log(`Added Match ${matchId} to Queue`);

    res.json({ message: 'Ajanlar kuşandı, savaş başlıyor!', match });
  } catch (err: any) {
    console.error('Combat constraint error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/combat/status', async (req, res) => {
  const { matchId } = req.query;

  if (!matchId || typeof matchId !== 'string') {
    return res.status(400).json({ error: 'Missing matchId' });
  }

  try {
    // 1. Fetch the match and join bot data
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('*, player_1:bots!matches_player_1_id_fkey(*), player_2:bots!matches_player_2_id_fkey(*)')
      .eq('id', matchId)
      .single();

    if (matchErr || !match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // 2. Fetch all logs for this match so far
    const { data: logs, error: logsErr } = await supabase
      .from('combat_logs')
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

app.post('/api/v1/oracle/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: "Token is required." });

  try {
    // In production, matching SECRET should be used. Using a dummy secret for structural setup.
    // Ensure you add JWT_SECRET to your environment variables later for true security.
    const secret = process.env.JWT_SECRET || 'lanista-super-secret-key';
    const decoded = jwt.verify(token, secret);

    res.json({ valid: true, proof: decoded });
  } catch (error: any) {
    res.status(401).json({ valid: false, error: "Invalid cryptographic signature. The token is corrupted or forged." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lanista Match API running on port ${PORT}`);
});