import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ActionType } from '@lanista/types';
import type { Gladiator, Match, CombatLog } from '@lanista/types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Mock Gladiators
const g1: Gladiator = {
  id: 'g1-' + Date.now(),
  name: 'Openclaw Alpha',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alpha',
  max_hp: 1000,
  current_hp: 1000,
  atk: 150,
  def: 50,
  is_alive: true,
};

const g2: Gladiator = {
  id: 'g2-' + Date.now(),
  name: 'Kite Protocol',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kite',
  max_hp: 1200,
  current_hp: 1200,
  atk: 120,
  def: 80,
  is_alive: true,
};

let currentInterval: NodeJS.Timeout | null = null;
let currentMatchState: {
  match: Match;
  g1Hp: number;
  g2Hp: number;
} | null = null;

app.post('/api/combat/start', async (req, res) => {
  if (currentInterval) {
    clearInterval(currentInterval);
  }

  const matchId = uuidv4();
  const match: Match = {
    id: matchId,
    gladiator1: { ...g1, current_hp: g1.max_hp, is_alive: true },
    gladiator2: { ...g2, current_hp: g2.max_hp, is_alive: true },
    status: 'IN_PROGRESS',
    created_at: new Date().toISOString()
  };

  currentMatchState = {
    match,
    g1Hp: match.gladiator1.max_hp,
    g2Hp: match.gladiator2.max_hp,
  };

  // Optionally store match in DB if schema exists
  // await supabaseAdmin.from('matches').insert(match);

  // Start combat loop
  currentInterval = setInterval(() => processCombatTurn(matchId), 2000);

  res.json({ message: 'Combat started', match });
});

app.get('/api/combat/status', (req, res) => {
  if (!currentMatchState) {
    return res.status(404).json({ error: 'No active match' });
  }
  res.json({ match: currentMatchState.match });
});

async function processCombatTurn(matchId: string) {
  if (!currentMatchState) return;

  const { match, g1Hp, g2Hp } = currentMatchState;

  if (g1Hp <= 0 || g2Hp <= 0) {
    if (currentInterval) clearInterval(currentInterval);
    const winnerId = g1Hp > 0 ? match.gladiator1.id : match.gladiator2.id;
    match.status = 'FINISHED';
    match.winner_id = winnerId;
    match.gladiator1.is_alive = g1Hp > 0;
    match.gladiator2.is_alive = g2Hp > 0;
    
    // Optionally update match status in DB
    // await supabaseAdmin.from('matches').update({ status: 'FINISHED', winner_id: winnerId }).eq('id', matchId);
    console.log(`Match ${matchId} finished. Winner: ${winnerId}`);
    return;
  }

  // Randomize attacker/defender
  const isG1Attacking = Math.random() > 0.5;
  const attacker = isG1Attacking ? match.gladiator1 : match.gladiator2;
  const defender = isG1Attacking ? match.gladiator2 : match.gladiator1;

  // Simple damage calculation
  const dmg = Math.max(0, attacker.atk + Math.floor(Math.random() * 50) - defender.def);
  
  // Apply damage
  if (isG1Attacking) {
    currentMatchState.g2Hp -= dmg;
    match.gladiator2.current_hp = currentMatchState.g2Hp;
  } else {
    currentMatchState.g1Hp -= dmg;
    match.gladiator1.current_hp = currentMatchState.g1Hp;
  }

  const actType = currentMatchState.g1Hp <= 0 || currentMatchState.g2Hp <= 0 ? ActionType.DIE : ActionType.ATTACK;

  const combatLog: CombatLog = {
    id: uuidv4(),
    match_id: matchId,
    attacker_id: attacker.id,
    defender_id: defender.id,
    action_type: actType,
    damage: dmg,
    description: `${attacker.name} attacked ${defender.name} for ${dmg} damage.`,
    timestamp: new Date().toISOString(),
  };

  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      await supabaseAdmin.from('combat_logs').insert(combatLog);
      console.log(`[Combat Log] ${combatLog.description}`);
    } else {
      console.log(`[Dry Run Combat Log] ${combatLog.description} (Supabase not configured)`);
    }
  } catch (err) {
    console.error('Error inserting combat log', err);
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lanista Match Engine is running on port ${PORT}`);
});