import { useMemo, useState } from 'react';
import type { Match } from '@lanista/types';
import { Zap, Lock, AlertCircle, X, Info } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';
import { useSupportPools } from '../../hooks/useSupportPools';

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

  if (match.is_pool_voided) {
    return (
      <div className="bg-[#0B0F19] rounded-xl border border-amber-500/30 overflow-hidden relative p-8 text-center flex flex-col items-center justify-center gap-4 group">
        <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg text-white">Community Pool Voided</h3>
        <p className="text-sm text-white/50 max-w-[280px] leading-relaxed">
          Not enough competition was found for this match. All support has been <span className="text-amber-400 font-bold italic underline">refunded</span> to your balance.
        </p>
        <div className="font-mono text-[10px] text-white/20 uppercase tracking-widest mt-2">
          Status: Unmatched Pool // Proof recorded
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F19] rounded-xl border border-white/10 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-50" />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm tracking-[0.2em] text-white/40 uppercase">Arena Sentiment</h3>
            <span className="font-mono text-xs text-white/50">{amounts.totalPool.toLocaleString()} Sparks backed</span>
          </div>

          <div className="h-2 rounded-full overflow-hidden flex bg-white/5 border border-white/10">
            <div 
              className="bg-blue-500 transition-all duration-500 relative"
              style={{ width: `${amounts.bluePct}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-1/2 blur-sm" />
            </div>
            <div 
              className="bg-green-500 transition-all duration-500 relative"
              style={{ width: `${amounts.greenPct}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-1/2 ml-auto blur-sm" />
            </div>
          </div>
          <div className="flex justify-between mt-2 font-mono text-xs">
            <span className="text-blue-400">{amounts.bluePct}%</span>
            <span className="text-green-400">{amounts.greenPct}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 relative group/cards">
          {/* Blue Corner Card */}
          <button
            onClick={() => setSelectedSide('blue')}
            disabled={disabled}
            className={`relative p-3 sm:p-4 rounded-xl border text-left transition-all duration-300 ${
              selectedSide === 'blue'
                ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                : 'bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedSide === 'blue' && (
              <div className="absolute -inset-px rounded-xl border border-blue-400 animate-pulse" />
            )}
            <div className="text-xs sm:text-sm text-blue-400 font-mono mb-1 uppercase tracking-wider flex items-center gap-2">
              Blue Corner
            </div>
            <div className="font-bold text-white mb-2 flex justify-between items-center pr-2">
              <span className="truncate">{match.player_1?.name || 'Loading...'}</span>
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/40 text-blue-300 transition-colors z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReputationFor('blue');
                }}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="font-mono flex flex-col gap-1">
              <div className="text-sm text-white/70">
                {bluePool.toLocaleString()} Sparks
              </div>
              <div className={`text-xs ${multipliers.blueIsUnder ? 'text-amber-400' : 'text-white/40'}`}>
                {multipliers.blueIsUnder ? `⚡ Multi-boost: ${multipliers.blue.toFixed(2)}x` : `Stable Multiplier · 1.00x`}
              </div>
            </div>
          </button>

          {/* Green Corner Card */}
          <button
            onClick={() => setSelectedSide('green')}
            disabled={disabled}
            className={`relative p-3 sm:p-4 rounded-xl border text-left transition-all duration-300 ${
              selectedSide === 'green'
                ? 'bg-green-500/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                : 'bg-white/5 border-white/10 hover:border-green-500/50 hover:bg-green-500/5'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedSide === 'green' && (
              <div className="absolute -inset-px rounded-xl border border-green-400 animate-pulse" />
            )}
            <div className="text-xs sm:text-sm text-green-400 font-mono mb-1 uppercase tracking-wider flex items-center justify-end gap-2">
              Green Corner
            </div>
            <div className="font-bold text-white mb-2 text-right flex justify-between items-center flex-row-reverse pl-2">
              <span className="truncate">{match.player_2?.name || 'Loading...'}</span>
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center hover:bg-green-500/40 text-green-300 transition-colors z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReputationFor('green');
                }}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="font-mono text-right flex flex-col gap-1">
              <div className="text-sm text-white/70">
                {greenPool.toLocaleString()} Sparks
              </div>
              <div className={`text-xs ${multipliers.greenIsUnder ? 'text-amber-400' : 'text-white/40'}`}>
                {multipliers.greenIsUnder ? `⚡ Multi-boost: ${multipliers.green.toFixed(2)}x` : `Stable Multiplier · 1.00x`}
              </div>
            </div>
          </button>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                disabled={disabled || !selectedSide || isSubmitting}
                className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white font-mono placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 transition-all"
                placeholder="Sparks to contribute"
                min="100"
                step="100"
              />
            </div>
            
            <button
              onClick={handleSupport}
              disabled={disabled || !selectedSide || isSubmitting}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              <span>Back Strategy</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUPPORT_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => setAmountInput(amount.toString())}
                disabled={disabled || !selectedSide || isSubmitting}
                className="flex-1 min-w-[60px] py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-xs font-mono text-white/70 hover:text-white disabled:opacity-50 transition-colors"
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showReputationFor && reputationBot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowReputationFor(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#0a0e17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${showReputationFor === 'blue' ? 'border-blue-500/30 bg-blue-500/5' : 'border-green-500/30 bg-green-500/5'} flex justify-between items-center`}>
              <div>
                <h4 className="font-mono text-white/50 text-xs tracking-[0.2em] uppercase mb-1">Arena Record // ERC-8004</h4>
                <div className="font-bold text-lg text-white">{reputationBot.name}</div>
              </div>
              <button 
                onClick={() => setShowReputationFor(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              <div className="bg-black/30 rounded-xl p-4 border border-white/5 font-mono text-sm leading-relaxed text-white/60">
                <span className="text-white/80 font-bold block mb-2">Reputation Formula:</span>
                (Verified Wins × 10) − (Losses × 5) + Win Streak Bonus
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                  <div className="text-3xl font-black text-green-400 mb-1">{reputationBot.wins || 0}</div>
                  <div className="font-mono text-xs text-white/40 uppercase tracking-wider">Wins</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                  <div className="text-3xl font-black text-red-400/80 mb-1">{(reputationBot.total_matches || 0) - (reputationBot.wins || 0)}</div>
                  <div className="font-mono text-xs text-white/40 uppercase tracking-wider">Losses</div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border flex items-center justify-between ${showReputationFor === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <div className="font-mono text-sm uppercase tracking-wider text-white/60">Reputation Score</div>
                <div className={`text-2xl font-black ${showReputationFor === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>
                  {reputationBot.reputation_score || 0}
                </div>
              </div>

              <div className="flex justify-between items-center px-4 py-3 bg-black/40 rounded-xl border border-white/5">
                <span className="font-mono text-xs text-white/50 uppercase">Current ELO</span>
                <span className="font-bold text-white">{Math.round(reputationBot.elo || 1200)}</span>
              </div>

              <div className="flex items-start gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  All match results are proven cryptographically and recorded on the Avalanche blockchain. The reputation score is deterministic and immutable.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
