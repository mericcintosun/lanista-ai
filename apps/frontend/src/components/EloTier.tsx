import { motion } from 'framer-motion';
import { RankIcon } from './RankIcon';
import { getEloTier, getTierProgress } from '../lib/elo';

const TIER_GLOW_STYLES: Record<string, string> = {
  MASTER: '0 0 40px rgba(217,70,239,0.5), 0 0 80px rgba(217,70,239,0.2), inset 0 0 20px rgba(217,70,239,0.1)',
  DIAMOND: '0 0 40px rgba(34,211,238,0.5), 0 0 80px rgba(34,211,238,0.2), inset 0 0 20px rgba(34,211,238,0.1)',
  PLATINUM: '0 0 40px rgba(52,211,153,0.5), 0 0 80px rgba(52,211,153,0.2), inset 0 0 20px rgba(52,211,153,0.1)',
  GOLD: '0 0 40px rgba(234,179,8,0.5), 0 0 80px rgba(234,179,8,0.2), inset 0 0 20px rgba(234,179,8,0.1)',
  SILVER: '0 0 40px rgba(212,212,216,0.4), 0 0 80px rgba(212,212,216,0.15), inset 0 0 20px rgba(255,255,255,0.05)',
  BRONZE: '0 0 40px rgba(234,88,12,0.5), 0 0 80px rgba(234,88,12,0.2), inset 0 0 20px rgba(234,88,12,0.1)',
  IRON: '0 0 40px rgba(113,113,122,0.4), 0 0 80px rgba(113,113,122,0.15), inset 0 0 20px rgba(255,255,255,0.03)',
};

export function TierBadge({ elo, hasPlayed, prominent = false }: { elo: number; hasPlayed: boolean; prominent?: boolean }) {
  const tier = getEloTier(elo, hasPlayed);
  if (prominent) {
    const glowStyle = TIER_GLOW_STYLES[tier.name] ?? TIER_GLOW_STYLES.IRON;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative shrink-0"
      >
        <div
          className={`relative flex flex-col items-center justify-center min-w-[140px] sm:min-w-[180px] px-6 py-5 sm:px-8 sm:py-6 rounded-2xl border-2 ${tier.border} ${tier.bg} backdrop-blur-sm overflow-hidden`}
          style={{ boxShadow: glowStyle }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[8px] sm:text-[9px] text-white/50 uppercase tracking-[0.4em]">
            Rank
          </div>
          <div className="relative z-10 flex flex-col items-center gap-1 mt-2">
            <span className={`flex items-center justify-center drop-shadow-lg ${tier.color}`} style={{ textShadow: `0 0 24px currentColor` }}>
              <RankIcon rank={tier.name} size={48} strokeWidth={2.5} />
            </span>
            <span className={`font-mono text-sm sm:text-base font-black uppercase tracking-[0.35em] ${tier.color}`}>
              {tier.name}
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-white/90 uppercase tracking-widest mt-0.5">
              {elo} ELO
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest border ${tier.color} ${tier.border} ${tier.bg} ${tier.glow}`}>
      <RankIcon rank={tier.name} size={14} strokeWidth={2.5} className="shrink-0" />
      {tier.name}
    </span>
  );
}

/** Tier progress bar — Valorant-style. hideEloLabel: show only "X TO NEXT". size: "large" for bigger label text. labelRightOfBar: same row as bar, "X TO NEXT" on right. labelBelowBar: "X TO NEXT" on row below bar. */
export function TierProgressBar({ elo, hasPlayed, compact = false, hideEloLabel = false, size = 'default', labelRightOfBar = false, labelBelowBar = false }: { elo: number; hasPlayed: boolean; compact?: boolean; hideEloLabel?: boolean; size?: 'default' | 'large'; labelRightOfBar?: boolean; labelBelowBar?: boolean }) {
  const tier  = getEloTier(elo, hasPlayed);
  const prog  = getTierProgress(elo, hasPlayed);

  const barColor = {
    MASTER:   'bg-fuchsia-400',
    DIAMOND:  'bg-cyan-300',
    PLATINUM: 'bg-emerald-400',
    GOLD:     'bg-yellow-400',
    SILVER:   'bg-zinc-300',
    BRONZE:   'bg-orange-600',
    IRON:     'bg-zinc-600',
  }[tier.name] ?? 'bg-zinc-600';

  const labelClass = size === 'large' ? 'font-mono text-xs sm:text-sm font-bold uppercase tracking-widest' : 'font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest';
  const compactLabelClass = 'font-mono text-[9px] font-bold uppercase tracking-wider';
  const iconSize = labelRightOfBar || labelBelowBar ? 12 : 14;

  const toNextNode = prog.nextName ? (
    <span className={`${labelRightOfBar || labelBelowBar ? compactLabelClass : labelClass} ${hideEloLabel ? 'text-white' : 'text-zinc-500'} inline-flex items-center gap-2 min-w-0 max-w-full overflow-hidden`}>
      <span className="shrink-0">{prog.toNext} TO</span>
      <RankIcon rank={prog.nextName} size={iconSize} strokeWidth={2.5} className="shrink-0 flex-shrink-0" />
      <span className="truncate min-w-0">{prog.nextName}</span>
    </span>
  ) : (
    <span className={`${labelRightOfBar || labelBelowBar ? compactLabelClass : labelClass} text-fuchsia-400 shrink-0`}>MAX RANK</span>
  );

  if (!hasPlayed) return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full" />
      <span className={`${labelClass} text-zinc-600`}>UNRANKED</span>
    </div>
  );

  if (labelBelowBar) {
    return (
      <div className="flex flex-col gap-3 w-full min-w-0">
        <div className="relative h-3 w-full min-w-0 rounded-full overflow-hidden bg-white/10">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${prog.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor} blur-sm opacity-50`}
            initial={{ width: 0 }}
            animate={{ width: `${prog.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-end items-center gap-2 min-h-[20px]">{toNextNode}</div>
      </div>
    );
  }

  if (labelRightOfBar) {
    return (
      <div className="flex items-center gap-3 w-full min-w-0">
        <div className="relative h-2 flex-1 min-w-0 rounded-full overflow-hidden bg-white/10">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${prog.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor} blur-sm opacity-50`}
            initial={{ width: 0 }}
            animate={{ width: `${prog.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {toNextNode}
      </div>
    );
  }

  return (
    <div className={`w-full ${compact ? '' : 'space-y-1'}`}>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${prog.pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor} blur-sm opacity-50`}
          initial={{ width: 0 }}
          animate={{ width: `${prog.pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {!compact && (
        <div className="flex justify-between items-center mt-2">
          {!hideEloLabel && (
            <span className={`${labelClass} ${tier.color}`}>
              {elo} ELO
            </span>
          )}
          {toNextNode}
        </div>
      )}
    </div>
  );
}
