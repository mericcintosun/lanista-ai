/**
 * Lanista Arena — ELO Rating System
 *
 * Standard ELO formula:
 *   E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 *   R_A' = R_A + K * (S_A - E_A)
 *
 * K factor: The more experienced the player, the slower the change.
 *   < 10 matches → K = 100  (fast placement)
 *   < 30 matches → K = 64   (standard)
 *   ≥ 30 matches → K = 32   (stable — 55% winrate/200 matches ≈ SILVER/GOLD)
 *
 * Tier thresholds (estimated):
 *   IRON      0-99
 *   BRONZE  100-249  (~10-20 net wins)
 *   SILVER  250-449  (~20-35 net wins, ~100 matches 55%+)
 *   GOLD    450-699  (~35-55 net wins, ~150 matches 60%+)
 *   PLAT    700-999  (~55-80 net wins)
 *   DIAMOND 1000+    (top bots)
 *   MASTER  1400+    (exceptional)
 */

export interface EloResult {
  newWinnerElo: number;
  newLoserElo: number;
  winnerGain: number;  // positive
  loserLoss: number;   // positive (amount lost)
}

/**
 * Returns the K factor based on the player's total match count.
 */
export function getKFactor(totalMatches: number): number {
  if (totalMatches < 10) return 100;
  if (totalMatches < 30) return 64;
  return 32;
}

/**
 * Calculates the expected win probability of player A against player B (0-1 range).
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculates the new ELO values for both players based on the match result.
 *
 * @param winnerElo      Winner's current ELO
 * @param loserElo       Loser's current ELO
 * @param winnerMatches  Winner's total match count (for K factor)
 * @param loserMatches   Loser's total match count (for K factor)
 */
export function calculateElo(
  winnerElo: number,
  loserElo: number,
  winnerMatches: number,
  loserMatches: number,
): EloResult {
  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser = expectedScore(loserElo, winnerElo);

  // Symmetric K-factor to prevent ELO inflation at the bottom.
  // We use the lowest K factor (highest match count) so that 
  // veterans don't gain immense ELO when paired with new bots over and over.
  const kMatch = Math.min(getKFactor(winnerMatches), getKFactor(loserMatches));

  // Win loss delta must be symmetrical (zero-sum) to keep the ladder honest and respect WRs
  const delta = Math.round(kMatch * (1 - expectedWinner));

  // Give a small penalty for losing to lower Elo than expected? 
  // Pure zero-sum:
  const winnerGain = delta;
  const loserLoss = -delta;

  const newWinnerElo = Math.max(0, winnerElo + winnerGain);
  const newLoserElo = Math.max(0, loserElo + loserLoss);

  return {
    newWinnerElo,
    newLoserElo,
    winnerGain,
    loserLoss: Math.abs(loserLoss),
  };
}
