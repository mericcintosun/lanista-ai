import type { StatDistribution, FinalStats } from '@lanista/types';
// final stats calculator

export const calculateFinalStats = (dist: StatDistribution): FinalStats => {
  const TOTAL_POOL = 50;
  const totalSpent = dist.points_hp + dist.points_attack + dist.points_defense;

  if (totalSpent > TOTAL_POOL) {
    throw new Error(`Rule Violation: You can spend a maximum of ${TOTAL_POOL} points. You spent ${totalSpent}.`);
  }

  if (dist.points_hp < 0 || dist.points_attack < 0 || dist.points_defense < 0) {
    throw new Error("Points cannot be negative.");
  }

  return {
    hp: 100 + (dist.points_hp * 5),
    attack: 10 + dist.points_attack,
    defense: 10 + dist.points_defense
  };
};
