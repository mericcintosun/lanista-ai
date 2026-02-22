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

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Queue
const matchQueue = new Queue('match-queue', { connection });

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
  
  // If no DB just return memory
  res.json({ match: activeMatch, logs: [] });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lanista Match API running on port ${PORT}`);
});