import { useEffect, useRef } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWatchReward } from '../../hooks/useWatchReward';
import { useAuthStore } from '../../lib/auth-store';

const INACTIVE_STATUSES = ['finished', 'aborted'];

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface WatchRewardBadgeProps {
  matchStatus?: string;
}

export function WatchRewardBadge({ matchStatus }: WatchRewardBadgeProps) {
  const session = useAuthStore((s) => s.session);
  const { secondsLeft, canClaim, claiming, lastAmount, claim } = useWatchReward();
  const prevCanClaim = useRef(false);

  // Show toast when cooldown expires (after initial load)
  useEffect(() => {
    if (canClaim && prevCanClaim.current === false && lastAmount > 0) {
      toast(`+${lastAmount} ⚡ Spark hazır! Claim et.`, {
        icon: '⚡',
        position: 'top-right',
        duration: 4000,
        style: { background: '#18181b', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
      });
    }
    prevCanClaim.current = canClaim;
  }, [canClaim, lastAmount]);

  // Show toast on successful claim
  const prevClaiming = useRef(false);
  useEffect(() => {
    if (prevClaiming.current && !claiming && lastAmount > 0 && !canClaim) {
      toast.success(`+${lastAmount} ⚡ Spark kazandın!`, {
        position: 'top-right',
        duration: 3000,
        style: { background: '#18181b', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
      });
    }
    prevClaiming.current = claiming;
  }, [claiming, lastAmount, canClaim]);

  if (!session) return null;
  if (matchStatus && INACTIVE_STATUSES.includes(matchStatus)) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={canClaim && !claiming ? claim : undefined}
        disabled={!canClaim || claiming}
        className={[
          'relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-mono text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-lg backdrop-blur-sm',
          canClaim && !claiming
            ? 'border-amber-500/60 bg-zinc-900/90 text-amber-400 hover:bg-zinc-800/90 hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] cursor-pointer'
            : 'border-zinc-700/40 bg-zinc-900/70 text-zinc-500 cursor-default',
        ].join(' ')}
        title={canClaim ? 'Maç izleme ödülünü al' : `Sonraki ödül: ${formatCountdown(secondsLeft)}`}
      >
        {claiming ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
        ) : (
          <Zap className={`w-3.5 h-3.5 ${canClaim ? 'text-amber-400' : 'text-zinc-600'}`} fill={canClaim ? 'currentColor' : 'none'} />
        )}
        <span className="flex flex-col items-start leading-none gap-0.5">
          <span className={`text-[9px] tracking-[0.2em] ${canClaim ? 'text-amber-500/70' : 'text-zinc-600'}`}>
            WATCH REWARD
          </span>
          {canClaim ? (
            <span className="text-sm text-amber-300">+10 Spark</span>
          ) : (
            <span className="text-sm tabular-nums">{formatCountdown(secondsLeft)}</span>
          )}
        </span>
        {canClaim && !claiming && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        )}
      </button>
    </div>
  );
}
