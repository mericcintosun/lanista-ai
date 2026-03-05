import type { Match as BaseMatch } from '@lanista/types';

export interface MatchPlayer {
  name: string;
  hp: number;
  current_hp?: number;
  avatar_url?: string;
  [key: string]: unknown;
}

export interface MatchData extends Omit<BaseMatch, 'player_1' | 'player_2'> {
  player_1: MatchPlayer;
  player_2: MatchPlayer;
  [key: string]: unknown;
}

export interface CombatResponse {
  match: MatchData;
  logs: unknown[];
}
