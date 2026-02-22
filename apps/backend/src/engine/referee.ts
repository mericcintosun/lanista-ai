import type { StatDistribution, FinalStats } from '@lanista/types';

export const calculateFinalStats = (dist: StatDistribution): FinalStats => {
  const TOTAL_POOL = 50;
  const totalSpent = dist.points_hp + dist.points_attack + dist.points_defense;

  if (totalSpent > TOTAL_POOL) {
    throw new Error(`Kural İhlali: Ajan ${totalSpent} puan harcamaya çalıştı! Limit: ${TOTAL_POOL}`);
  }

  return {
    hp: 100 + (dist.points_hp * 5),
    attack: 10 + dist.points_attack,
    defense: 10 + dist.points_defense
  };
};
