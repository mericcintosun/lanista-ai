import { motion } from 'framer-motion';

// ─── ELO TIER SİSTEMİ ───────────────────────────────────────────────────────
// ELO 0'dan başlar. Tüm botlar birbirleriyle oynuyor (sıfır toplamlı sistem).
// Birbirine yakın win rate'lerde ELO'lar yakın kalır.
// 55% win rate / 200 maç ≈ 150-200 ELO (en iyi botlar için)
// Tier eşikleri buna göre kalibre edilmiştir:
export const ELO_TIERS = [
  { name: 'MASTER',   min: 1000, color: 'text-fuchsia-400', border: 'border-fuchsia-500/40', bg: 'bg-fuchsia-500/10', glow: 'shadow-[0_0_12px_rgba(217,70,239,0.4)]', icon: '♛' },
  { name: 'DIAMOND',  min:  600, color: 'text-cyan-300',    border: 'border-cyan-400/40',    bg: 'bg-cyan-400/10',    glow: 'shadow-[0_0_12px_rgba(34,211,238,0.3)]', icon: '◆' },
  { name: 'PLATINUM', min:  350, color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.3)]', icon: '✦' },
  { name: 'GOLD',     min:  200, color: 'text-yellow-400',  border: 'border-yellow-500/40',  bg: 'bg-yellow-500/10',  glow: 'shadow-[0_0_12px_rgba(234,179,8,0.3)]',  icon: '●' },
  { name: 'SILVER',   min:  100, color: 'text-zinc-300',    border: 'border-zinc-400/40',    bg: 'bg-zinc-400/10',    glow: '',                                        icon: '○' },
  { name: 'BRONZE',   min:   30, color: 'text-orange-600',  border: 'border-orange-700/40',  bg: 'bg-orange-700/10',  glow: '',                                        icon: '△' },
  { name: 'IRON',     min:    0, color: 'text-zinc-600',    border: 'border-zinc-700/40',    bg: 'bg-zinc-700/10',    glow: '',                                        icon: '▽' },
] as const;

export function getEloTier(elo: number, hasPlayed: boolean) {
  if (!hasPlayed) return ELO_TIERS.find(t => t.name === 'IRON')!;
  return ELO_TIERS.find(t => elo >= t.min) ?? ELO_TIERS[ELO_TIERS.length - 1];
}

/** Mevcut tier içindeki ilerleme bilgisini döndürür */
export function getTierProgress(elo: number, hasPlayed: boolean) {
  const tierIndex = hasPlayed
    ? ELO_TIERS.findIndex(t => elo >= t.min)
    : ELO_TIERS.length - 1;

  const currentTier = ELO_TIERS[tierIndex];
  const nextTier    = tierIndex > 0 ? ELO_TIERS[tierIndex - 1] : null; // bir üst tier

  if (!nextTier) {
    // MASTER — zaten max tier
    return { pct: 100, toNext: 0, nextName: null, tierMin: currentTier.min, nextMin: null };
  }

  const tierMin = currentTier.min;
  const nextMin = nextTier.min;
  const MathClamp = Math.min(100, Math.max(0, Math.round(((elo - tierMin) / (nextMin - tierMin)) * 100)));
  const toNext  = nextMin - elo;

  return { pct: MathClamp, toNext, nextName: nextTier.name, tierMin, nextMin };
}

export function TierBadge({ elo, hasPlayed }: { elo: number; hasPlayed: boolean }) {
  const tier = getEloTier(elo, hasPlayed);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest border ${tier.color} ${tier.border} ${tier.bg} ${tier.glow}`}>
      <span>{tier.icon}</span> {tier.name}
    </span>
  );
}

/** Tier progress bar — Valorant tarzı */
export function TierProgressBar({ elo, hasPlayed, compact = false }: { elo: number; hasPlayed: boolean; compact?: boolean }) {
  const tier  = getEloTier(elo, hasPlayed);
  const prog  = getTierProgress(elo, hasPlayed);

  // bar rengi tier'a göre
  const barColor = {
    MASTER:   'bg-fuchsia-400',
    DIAMOND:  'bg-cyan-300',
    PLATINUM: 'bg-emerald-400',
    GOLD:     'bg-yellow-400',
    SILVER:   'bg-zinc-300',
    BRONZE:   'bg-orange-600',
    IRON:     'bg-zinc-600',
  }[tier.name] ?? 'bg-zinc-600';

  if (!hasPlayed) return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/5 rounded-full" />
      <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">UNRANKED</span>
    </div>
  );

  return (
    <div className={`w-full ${compact ? '' : 'space-y-1'}`}>
      {/* Bar */}
      <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${prog.pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Glow effect */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor} blur-sm opacity-50`}
          initial={{ width: 0 }}
          animate={{ width: `${prog.pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {/* Label */}
      {!compact && (
        <div className="flex justify-between items-center">
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${tier.color}`}>
            {elo} ELO
          </span>
          {prog.nextName ? (
            <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
              {prog.toNext} TO {prog.nextName}
            </span>
          ) : (
            <span className="font-mono text-[9px] text-fuchsia-400 uppercase tracking-widest">MAX RANK</span>
          )}
        </div>
      )}
    </div>
  );
}
