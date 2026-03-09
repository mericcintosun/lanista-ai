export const ELO_TIERS = [
  { name: 'MASTER',   min: 1000, color: 'text-fuchsia-400', border: 'border-fuchsia-500/40', bg: 'bg-fuchsia-500/10', glow: 'shadow-[0_0_12px_rgba(217,70,239,0.4)]', icon: '♛', confettiColors: ['#e879f9', '#d946ef', '#c026d3', '#a21caf'] },
  { name: 'DIAMOND',  min:  600, color: 'text-cyan-300',    border: 'border-cyan-400/40',    bg: 'bg-cyan-400/10',    glow: 'shadow-[0_0_12px_rgba(34,211,238,0.3)]', icon: '◆', confettiColors: ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2'] },
  { name: 'PLATINUM', min:  350, color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.3)]', icon: '✦', confettiColors: ['#34d399', '#10b981', '#059669', '#047857'] },
  { name: 'GOLD',     min:  200, color: 'text-yellow-400',  border: 'border-yellow-500/40',  bg: 'bg-yellow-500/10',  glow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]',  icon: '●', confettiColors: ['#facc15', '#eab308', '#ca8a04', '#a16207'] },
  { name: 'SILVER',   min:  100, color: 'text-zinc-300',    border: 'border-zinc-400/40',    bg: 'bg-zinc-400/10',    glow: '',                                        icon: '○', confettiColors: ['#d4d4d8', '#a1a1aa', '#71717a', '#52525b'] },
  { name: 'BRONZE',   min:   30, color: 'text-orange-600',  border: 'border-orange-700/40',  bg: 'bg-orange-700/10',  glow: '',                                        icon: '△', confettiColors: ['#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
  { name: 'IRON',     min:    0, color: 'text-zinc-600',    border: 'border-zinc-700/40',    bg: 'bg-zinc-700/10',    glow: '',                                        icon: '▽', confettiColors: ['#71717a', '#52525b', '#3f3f46', '#27272a'] },
] as const;

export type EloTierName = typeof ELO_TIERS[number]['name'];

export function getEloTier(elo: number, hasPlayed: boolean) {
  if (!hasPlayed) return ELO_TIERS.find(t => t.name === 'IRON')!;
  return ELO_TIERS.find(t => elo >= t.min) ?? ELO_TIERS[ELO_TIERS.length - 1];
}

/** Returns progress info within current tier */
export function getTierProgress(elo: number, hasPlayed: boolean) {
  const tierIndex = hasPlayed
    ? ELO_TIERS.findIndex(t => elo >= t.min)
    : ELO_TIERS.length - 1;

  const currentTier = ELO_TIERS[tierIndex];
  const nextTier    = tierIndex > 0 ? ELO_TIERS[tierIndex - 1] : null; // next tier (one above)

  if (!nextTier) {
    // MASTER — already max tier
    return { pct: 100, toNext: 0, nextName: null, tierMin: currentTier.min, nextMin: null };
  }

  const tierMin = currentTier.min;
  const nextMin = nextTier.min;
  const pct = Math.min(100, Math.max(0, Math.round(((elo - tierMin) / (nextMin - tierMin)) * 100)));
  const toNext  = nextMin - elo;

  return { pct, toNext, nextName: nextTier.name, tierMin, nextMin };
}
