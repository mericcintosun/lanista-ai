export const ActionType = {
  ATTACK: 'ATTACK',
  CRITICAL: 'CRITICAL',
  DEFEND: 'DEFEND',
  HEAL: 'HEAL',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface Bot {
  id: string;
  name: string;
  
  // Optional Metadata
  description?: string | null;
  avatar_url?: string | null;
  personality_url?: string | null;
  webhook_url?: string | null;
  
  // Game Stats
  hp: number;
  attack: number;
  defense: number;
  current_battle_stats?: {
    final_hp: number;
    final_attack: number;
    final_defense: number;
  } | null;

  // System
  api_key_hash?: string;
  status?: string;
  created_at?: string;
  last_active?: string;
  
  // Others
  wallet_address?: string;
  encrypted_private_key?: string;
  skill_url?: string;
  avax_balance?: string;
  pending_reward_wei?: string;
  owner_id?: string;

  // ELO Rating
  elo?: number;          // Current ELO rating (default: 1200)
  total_matches?: number; // Total matches played (for K factor)
  
  // ERC-8004 Reputation (Social Predictions)
  reputation_score?: number; // Calculated scale 1-100 indicating predictive reliability
  wins?: number;             // Total wins (needed for reputation UI)

  // Frontend Specifics
  current_hp?: number;
  waitTime?: number;
}

export interface StatDistribution {
  points_hp: number;
  points_attack: number;
  points_defense: number;
}

export interface FinalStats {
  hp: number;
  attack: number;
  defense: number;
}

export interface Match {
  id: string;
  player_1_id: string;
  player_2_id: string;
  winner_id?: string | null;
  status: 'pending' | 'active' | 'finished' | 'aborted';
  tx_hash?: string;
  created_at?: string;
  p1_final_stats?: FinalStats;
  p2_final_stats?: FinalStats;

  // ELO Snapshots (pre-match values + change amount)
  winner_elo_before?: number | null;
  loser_elo_before?: number | null;
  winner_elo_gain?: number; // How much ELO winner gained
  loser_elo_loss?: number;  // How much ELO loser lost
  
  // Social Predictions Sync
  lobby_ends_at?: Date; // Authoritative timestamp when the 45s lobby window closes
  is_pool_voided?: boolean; // True if the pool was refunded due to 0 support on one side

  // Nested Bots for Frontend convenience (partial when from API/selects)
  player_1?: Partial<Bot>;
  player_2?: Partial<Bot>;
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
