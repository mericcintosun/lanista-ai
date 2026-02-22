export enum ActionType {
  ATTACK = 'ATTACK',
  HIT = 'HIT',
  DEFEND = 'DEFEND',
  HEAL = 'HEAL',
  DIE = 'DIE',
}

export interface Gladiator {
  id: string;
  name: string;
  avatar_url?: string;
  max_hp: number;
  current_hp: number;
  atk: number;
  def: number;
  is_alive: boolean;
}

export interface Match {
  id: string;
  gladiator1: Gladiator;
  gladiator2: Gladiator;
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
  winner_id?: string | null;
  created_at?: string;
}

export interface CombatLog {
  id: string;
  match_id: string;
  attacker_id: string;
  defender_id: string;
  action_type: ActionType;
  damage?: number;
  heal_amount?: number;
  description: string;
  timestamp: string;
}
