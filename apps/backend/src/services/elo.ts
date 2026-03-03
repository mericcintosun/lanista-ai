/**
 * Lanista Arena — ELO Rating System
 *
 * Standart ELO formülü:
 *   E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 *   R_A' = R_A + K * (S_A - E_A)
 *
 * K faktörü: Oyuncu ne kadar deneyimliyse o kadar yavaş değişir.
 *   < 10 maç   → K = 100  (hızlı yerleşme / placement)
 *   < 30 maç   → K = 64   (standart)
 *   ≥ 30 maç   → K = 32   (stabil — 55% winrate/200 maç ≈ SILVER/GOLD)
 *
 * Tier eşikleri (tahmini):
 *   IRON      0-99
 *   BRONZE  100-249  (~10-20 net kazanım)
 *   SILVER  250-449  (~20-35 net kazanım, ~100 maç %55+)
 *   GOLD    450-699  (~35-55 net kazanım, ~150 maç %60+)
 *   PLAT    700-999  (~55-80 net kazanım)
 *   DIAMOND 1000+    (en iyi botlar)
 *   MASTER  1400+    (istisnai)
 */

export interface EloResult {
  newWinnerElo: number;
  newLoserElo: number;
  winnerGain: number;  // pozitif
  loserLoss: number;   // pozitif (kayıp miktarı)
}

/**
 * Maç başındaki toplam maç sayısına göre K faktörünü döndürür.
 */
export function getKFactor(totalMatches: number): number {
  if (totalMatches < 10) return 100;
  if (totalMatches < 30) return 64;
  return 32;
}

/**
 * A oyuncusunun B'ye karşı beklenen kazanma olasılığını hesaplar (0-1 arası).
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Maç sonucuna göre her iki oyuncunun yeni ELO değerini hesaplar.
 *
 * @param winnerElo      Kazananın mevcut ELO'su
 * @param loserElo       Kaybedenin mevcut ELO'su
 * @param winnerMatches  Kazananın toplam maç sayısı (K faktörü için)
 * @param loserMatches   Kaybedenin toplam maç sayısı (K faktörü için)
 */
export function calculateElo(
  winnerElo: number,
  loserElo: number,
  winnerMatches: number,
  loserMatches: number,
): EloResult {
  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser  = expectedScore(loserElo, winnerElo);

  const kWinner = getKFactor(winnerMatches);
  const kLoser  = getKFactor(loserMatches);

  const winnerGain = Math.round(kWinner * (1 - expectedWinner));
  const loserLoss  = Math.round(kLoser  * (0 - expectedLoser));

  // ELO 0'ın altına düşmesin
  const newWinnerElo = Math.max(0, winnerElo + winnerGain);
  const newLoserElo  = Math.max(0, loserElo  + loserLoss);

  return {
    newWinnerElo,
    newLoserElo,
    winnerGain,
    loserLoss: Math.abs(loserLoss),
  };
}
