import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Match } from '@lanista/types';
import { Zap, Lock, AlertCircle, X, Info } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';
import { useSupportPools } from '../../hooks/useSupportPools';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface SupportPanelProps {
  match: Match;
  disabled?: boolean;
}

// Spark bundles
const SUPPORT_AMOUNTS = [100, 500, 1000, 5000];

function computeUnderdogMultipliers(p1Elo: number = 1200, p2Elo: number = 1200) {
  const MAX_MULTIPLIER = 2.0;

  if (p1Elo === p2Elo) return { blue: 1.0, green: 1.0, blueIsUnder: false, greenIsUnder: false };

  if (p1Elo < p2Elo) {
    const diffTokens = Math.min((p2Elo - p1Elo) / 100, 1);
    const m = 1.0 + diffTokens * (MAX_MULTIPLIER - 1.0);
    return { blue: Number(m.toFixed(2)), green: 1.0, blueIsUnder: true, greenIsUnder: false };
  } else {
    const diffTokens = Math.min((p1Elo - p2Elo) / 100, 1);
    const m = 1.0 + diffTokens * (MAX_MULTIPLIER - 1.0);
    return { blue: 1.0, green: Number(m.toFixed(2)), blueIsUnder: false, greenIsUnder: true };
  }
}

export function SupportPanel({ match, disabled }: SupportPanelProps) {
  const [selectedSide, setSelectedSide] = useState<'blue' | 'green' | null>(null);
  const [amountInput, setAmountInput] = useState<string>('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReputationFor, setShowReputationFor] = useState<'blue' | 'green' | null>(null);
  
  const { session } = useAuthStore();

  const { bluePool, greenPool, setBluePool, setGreenPool } = useSupportPools(match.id);

  const amounts = useMemo(() => {
    const totalPool = bluePool + greenPool;
    const bluePct = totalPool === 0 ? 50 : Math.round((bluePool / totalPool) * 100);
    const greenPct = 100 - bluePct;
    return { bluePct, greenPct, totalPool };
  }, [bluePool, greenPool]);

  const multipliers = useMemo(() => {
    return computeUnderdogMultipliers(match.player_1?.elo, match.player_2?.elo);
  }, [match.player_1?.elo, match.player_2?.elo]);

  const handleSupport = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to support');
      return;
    }
    if (!selectedSide) {
      toast.error('Select a side first');
      return;
    }

    const numAmount = parseInt(amountInput);
    if (isNaN(numAmount) || numAmount < 100) {
      toast.error('Minimum support amount is 100 Sparks');
      return;
    }

    const isFinished = match.status === 'finished' || match.status === 'aborted';
    if (isFinished) {
      toast.error('Match is already finished');
      return;
    }

    setIsSubmitting(true);
    try {
      const type = selectedSide === 'blue' ? 'support_player_1' : 'support_player_2';
      
      const res = await fetch(`${API_URL}/sparks/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          type,
          reference_id: match.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit support');

      // Instead of an imaginary setSparkBalance on useAuthStore, just let the next polling/restart update it
      toast.success(`Backing ${selectedSide === 'blue' ? match.player_1?.name : match.player_2?.name} with ${numAmount} Sparks!`);
      
      if (selectedSide === 'blue') setBluePool(p => p + numAmount);
      else setGreenPool(p => p + numAmount);
      
      setAmountInput('100');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reputationBot = showReputationFor === 'blue' ? match.player_1 : match.player_2;

  useLockBodyScroll(!!showReputationFor);

  useEffect(() => {
    if (!showReputationFor) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowReputationFor(null);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [showReputationFor]);

  if (match.is_pool_voided) {
    return (
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-700/80 overflow-hidden relative p-8 text-center flex flex-col items-center justify-center gap-4">
        <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg text-white">Community Pool Voided</h3>
        <p className="text-sm text-zinc-400 max-w-[280px] leading-relaxed">
          Not enough competition was found for this match. All support has been <span className="text-amber-400 font-bold italic underline">refunded</span> to your balance.
        </p>
        <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
          Status: Unmatched Pool // Proof recorded
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 rounded-xl border border-zinc-700/80 overflow-hidden relative min-w-0 w-full">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500/40" />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-sm tracking-[0.2em] text-zinc-500 uppercase">Arena Sentiment</h3>
            <span className="font-mono text-xs text-zinc-500">{amounts.totalPool.toLocaleString()} Sparks backed</span>
          </div>

          <div className="h-2 rounded-full overflow-hidden flex bg-zinc-800/80 border border-zinc-700/80">
            <div
              className="bg-zinc-600 transition-all duration-500"
              style={{ width: `${amounts.bluePct}%` }}
            />
            <div
              className="bg-amber-500/70 transition-all duration-500"
              style={{ width: `${amounts.greenPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 font-mono text-xs text-zinc-400">
            <span>Corner 1 · {amounts.bluePct}%</span>
            <span>Corner 2 · {amounts.greenPct}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 relative group/cards min-w-0">
          {/* Corner 1 (Blue / P1) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => !disabled && setSelectedSide('blue')}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                e.preventDefault();
                setSelectedSide('blue');
              }
            }}
            className={`relative p-3 sm:p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
              selectedSide === 'blue'
                ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                : 'bg-zinc-800/50 border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-800/70'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedSide === 'blue' && (
              <div className="absolute -inset-px rounded-xl border border-amber-500/50 pointer-events-none" />
            )}
            <div className="text-xs sm:text-sm text-zinc-400 font-mono mb-1 uppercase tracking-wider flex items-center gap-2">
              Corner 1
            </div>
            <div className="font-bold text-white mb-2 flex justify-between items-center pr-2">
              <span className="truncate">{match.player_1?.name || 'Loading...'}</span>
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 text-zinc-300 transition-colors z-10 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowReputationFor('blue');
                }}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="font-mono flex flex-col gap-1">
              <div className="text-sm text-zinc-300">
                {bluePool.toLocaleString()} Sparks
              </div>
              <div className={`text-xs ${multipliers.blueIsUnder ? 'text-amber-400' : 'text-zinc-500'}`}>
                {multipliers.blueIsUnder ? `Multi-boost: ${multipliers.blue.toFixed(2)}x` : `Stable · 1.00x`}
              </div>
            </div>
          </div>

          {/* Corner 2 (Green / P2) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => !disabled && setSelectedSide('green')}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                e.preventDefault();
                setSelectedSide('green');
              }
            }}
            className={`relative p-3 sm:p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
              selectedSide === 'green'
                ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                : 'bg-zinc-800/50 border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-800/70'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedSide === 'green' && (
              <div className="absolute -inset-px rounded-xl border border-amber-500/50 pointer-events-none" />
            )}
            <div className="text-xs sm:text-sm text-zinc-400 font-mono mb-1 uppercase tracking-wider flex items-center justify-end gap-2">
              Corner 2
            </div>
            <div className="font-bold text-white mb-2 text-right flex justify-between items-center flex-row-reverse pl-2">
              <span className="truncate">{match.player_2?.name || 'Loading...'}</span>
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 text-zinc-300 transition-colors z-10 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowReputationFor('green');
                }}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="font-mono text-right flex flex-col gap-1">
              <div className="text-sm text-zinc-300">
                {greenPool.toLocaleString()} Sparks
              </div>
              <div className={`text-xs ${multipliers.greenIsUnder ? 'text-amber-400' : 'text-zinc-500'}`}>
                {multipliers.greenIsUnder ? `Multi-boost: ${multipliers.green.toFixed(2)}x` : `Stable · 1.00x`}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-zinc-700/80">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/80 shrink-0" />
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                disabled={disabled || !selectedSide || isSubmitting}
                className="w-full bg-zinc-900/80 border border-zinc-700 rounded-lg py-2 pl-9 pr-4 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 transition-all"
                placeholder="Sparks to contribute"
                min="100"
                step="100"
              />
            </div>

            <button
              onClick={handleSupport}
              disabled={disabled || !selectedSide || isSubmitting}
              className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              <span>Back Strategy</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 min-w-0">
            {SUPPORT_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => setAmountInput(amount.toString())}
                disabled={disabled || !selectedSide || isSubmitting}
                className="flex-1 min-w-[60px] py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 text-xs font-mono text-zinc-300 hover:text-white disabled:opacity-50 transition-colors"
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showReputationFor && reputationBot && createPortal(
        (() => {
          const pool = showReputationFor === 'blue' ? bluePool : greenPool;
          const mult = showReputationFor === 'blue' ? multipliers.blue : multipliers.green;
          const isUnder = showReputationFor === 'blue' ? multipliers.blueIsUnder : multipliers.greenIsUnder;
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="prediction-modal-title"
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReputationFor(null)}
            >
              <div
                className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 border-b border-zinc-700 bg-zinc-800/50 flex justify-between items-center">
                  <div>
                    <h4 id="prediction-modal-title" className="font-mono text-zinc-500 text-xs tracking-[0.2em] uppercase mb-1">
                      Prediction · Arena Record
                    </h4>
                    <div className="font-bold text-lg text-white">{reputationBot.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReputationFor(null)}
                    className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 font-mono text-sm leading-relaxed text-zinc-400">
                    <span className="text-white font-bold block mb-2">Reputation Formula</span>
                    (Verified Wins × 10) − (Losses × 5) + Win Streak Bonus
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700">
                      <div className="text-3xl font-black text-amber-400 mb-1">{reputationBot.wins || 0}</div>
                      <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Wins</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700">
                      <div className="text-3xl font-black text-zinc-400 mb-1">{(reputationBot.total_matches || 0) - (reputationBot.wins || 0)}</div>
                      <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Losses</div>
                    </div>
                  </div>

                  <div className="rounded-xl p-4 border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
                    <span className="font-mono text-sm uppercase tracking-wider text-zinc-400">Reputation Score</span>
                    <span className="text-2xl font-black text-amber-400">{reputationBot.reputation_score || 0}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <span className="font-mono text-xs text-zinc-500 uppercase">Current ELO</span>
                    <span className="font-bold text-white">{Math.round(reputationBot.elo || 1200)}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <span className="font-mono text-xs text-zinc-500 uppercase">Sparks backed</span>
                    <span className="font-bold text-amber-400/90">{pool.toLocaleString()}</span>
                  </div>

                  {isUnder && (
                    <div className="px-4 py-3 bg-zinc-800/50 rounded-xl border border-zinc-700 font-mono text-sm text-amber-400">
                      Multi-boost: {mult.toFixed(2)}x
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700 text-zinc-400">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-500/80" />
                    <p className="text-xs leading-relaxed">
                      All match results are proven cryptographically and recorded on the Avalanche blockchain. The reputation score is deterministic and immutable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
