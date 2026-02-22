export enum ActionType {
  ATTACK = 'ATTACK',
  CRITICAL = 'CRITICAL',
  DEFEND = 'DEFEND',
  HEAL = 'HEAL',
}

export interface Bot {
  id: string;
  name: string;
  owner_id?: string;
  hp: number;
  attack: number;
  defense: number;
  wallet_address?: string;
  encrypted_private_key?: string;
  created_at?: string;
  
  // Frontend/Runtime Specifics (not always in DB)
  avatar_url?: string;
  current_hp?: number;
}

export interface Match {
  id: string;
  player_1_id: string;
  player_2_id: string;
  winner_id?: string | null;
  status: 'pending' | 'active' | 'finished';
  tx_hash?: string;
  created_at?: string;
  
  // Nested Bots for Frontend convenience
  player_1?: Bot;
  player_2?: Bot;
}

export interface CombatLog {
  id?: number | string;
  match_id: string;
  actor_id: string;
  action_type: ActionType | string;
  value: number; // damage
  narrative: string;
  target_current_hp: number;
  created_at?: string;
}
