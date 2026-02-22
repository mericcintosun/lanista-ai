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
  
  // Real implementation would extract these from DB
  const p1 = { ...mockP1, id: uuidv4() };
  const p2 = { ...mockP2, id: uuidv4() };

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

  try {
    // Optionally create in DB
    if (process.env.SUPABASE_URL) {
      // First ensure bots exist or create them with correct DB schema columns
      const dbP1 = { id: p1.id, name: p1.name, hp: p1.hp, attack: p1.attack, defense: p1.defense };
      const dbP2 = { id: p2.id, name: p2.name, hp: p2.hp, attack: p2.attack, defense: p2.defense };
      
      const { error: bErr } = await supabase.from('bots').upsert([dbP1, dbP2]);
      if (bErr) console.error('Bot Upsert Error:', bErr);

      const { error: mErr } = await supabase.from('matches').insert({
        id: match.id,
        player_1_id: match.player_1_id,
        player_2_id: match.player_2_id,
        status: match.status
      });
      if (mErr) console.error('Match Insert Error:', mErr);
    }
  } catch (err) {
    console.error('Initial DB insert failed:', err);
  }

  activeMatch = match;

  // Add the match job to BullMQ queue
  await matchQueue.add('start-match', { 
    matchId, 
    p1, 
    p2 
  });

  console.log(`Added Match ${matchId} to Queue`);

  res.json({ message: 'Combat queued', match });
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