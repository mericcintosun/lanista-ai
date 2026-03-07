/**
 * Rank tier thresholds aligned with frontend (lib/elo.ts) and contract (RankUpLootNFT).
 * Index 0 = IRON, 1 = BRONZE, 2 = SILVER, 3 = GOLD, 4 = PLATINUM, 5 = DIAMOND, 6 = MASTER.
 */
export const RANK_TIERS = [
  { name: 'IRON', min: 0 },
  { name: 'BRONZE', min: 30 },
  { name: 'SILVER', min: 100 },
  { name: 'GOLD', min: 200 },
  { name: 'PLATINUM', min: 350 },
  { name: 'DIAMOND', min: 600 },
  { name: 'MASTER', min: 1000 },
] as const;

export const RANK_NAMES = RANK_TIERS.map((t) => t.name);

/**
 * Returns rank index 0..6 for a given ELO. If !hasPlayed, returns 0 (Iron).
 */
export function getRankIndex(elo: number, hasPlayed: boolean): number {
  if (!hasPlayed) return 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANK_TIERS[i].min) return i;
  }
  return 0;
}

export function getRankName(elo: number, hasPlayed: boolean): string {
  return RANK_TIERS[getRankIndex(elo, hasPlayed)].name;
}
