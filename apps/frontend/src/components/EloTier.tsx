import { motion } from 'framer-motion';
import {getEloTier, getTierProgress } from '../lib/elo';

// ─── ELO TIER SİSTEMİ ───────────────────────────────────────────────────────
// ELO 0'dan başlar. Tüm botlar birbirleriyle oynuyor (sıfır toplamlı sistem).
// ... (rest of the file stays same)

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
