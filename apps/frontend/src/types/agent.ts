import type { Bot as BaseBot } from '@lanista/types';

export interface BotData extends BaseBot {
  true_wins?: number;
  true_total_matches?: number;
  api_endpoint?: string;
}

export type { BaseBot };
