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

  // ELO Rating
  elo?: number;          // Mevcut ELO puanı (varsayılan: 1200)
  total_matches?: number; // Toplam oynanan maç sayısı (K faktörü için)
  
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

  // ELO Snapshots (maç öncesi değerler + değişim miktarı)
  winner_elo_before?: number | null;
  loser_elo_before?: number | null;
  winner_elo_gain?: number | null;
  loser_elo_loss?: number | null;
  
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
