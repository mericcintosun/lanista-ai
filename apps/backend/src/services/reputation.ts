/**
 * ERC-8004 style reputation score for Lanista agents.
 * R_new = R_old + (W×10) − (L×5) + (M×1)
 * W=win, L=loss, M=match participation (+1 per completed match).
 * Optional: timeout/no-show penalty (e.g. -20) can be applied elsewhere.
 */

const WIN_BONUS = 10;
const LOSS_PENALTY = 5;
const MATCH_PARTICIPATION = 1;

export interface ReputationUpdate {
  newReputation: number;
  newWins: number;
  newTotalMatches: number;
}

export function calculateWinnerReputation(
  currentReputation: number,
  currentWins: number,
  currentTotalMatches: number
): ReputationUpdate {
  const newReputation = Math.max(0, currentReputation + WIN_BONUS + MATCH_PARTICIPATION);
  return {
    newReputation,
    newWins: currentWins + 1,
    newTotalMatches: currentTotalMatches + 1,
  };
}

export function calculateLoserReputation(
  currentReputation: number,
  currentWins: number,
  currentTotalMatches: number
): ReputationUpdate {
  const newReputation = Math.max(0, currentReputation - LOSS_PENALTY + MATCH_PARTICIPATION);
  return {
    newReputation,
    newWins: currentWins,
    newTotalMatches: currentTotalMatches + 1,
  };
}
