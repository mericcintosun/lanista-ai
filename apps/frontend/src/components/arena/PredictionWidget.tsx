import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Flame } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { useSparkBalance } from '../../hooks/useSparkBalance';
import type { Match } from '@lanista/types';

const BET_CLOSE_SEC = 30;
const MIN_BET = 100;

interface PredictionWidgetProps {
  match: Match;
  matchId: string;
  session: { access_token: string; user: { id: string } } | null;
  onBetPlaced?: () => void;
}

interface PoolData {
  pool: Record<string, number>;
  myPrediction: { predicted_bot_id: string; amount: number } | null;
}

export function PredictionWidget({
  match,
  matchId,
  session,
  onBetPlaced,
}: PredictionWidgetProps) {
  const [secondsLeft, setSecondsLeft] = useState(BET_CLOSE_SEC);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);

  const { balance: sparkBalance, loading: balanceLoading } = useSparkBalance(session);

  useEffect(() => {
    if (!matchId || !session) return;
    const fetchPool = async () => {
      try {
        const res = await fetch(`${API_URL}/sparks/predictions/${matchId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPoolData({ pool: data.pool ?? {}, myPrediction: data.myPrediction ?? null });
        }
      } catch {
        setPoolData({ pool: {}, myPrediction: null });
      }
    };
    fetchPool();
    const t = setInterval(fetchPool, 5000);
    return () => clearInterval(t);
  }, [matchId, session]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const p1 = match?.player_1;
  const p2 = match?.player_2;
  const p1Id = match?.player_1_id ?? p1?.id;
  const p2Id = match?.player_2_id ?? p2?.id;

  const pool1 = poolData?.pool?.[p1Id] ?? 0;
  const pool2 = poolData?.pool?.[p2Id] ?? 0;
  const totalPool = pool1 + pool2;

  const handleLockIn = async () => {
    const botId = selectedBotId ?? p1Id;
    const amt = Math.floor(Number(amount) || 0);
    if (amt < MIN_BET || !session) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sparks/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          match_id: matchId,
          predicted_bot_id: botId,
          amount: amt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Bet failed');
        return;
      }
      setPoolData((prev) => ({
        pool: prev?.pool ?? {},
        myPrediction: { predicted_bot_id: botId, amount: amt },
      }));
      setAmount('');
      onBetPlaced?.();
    } finally {
      setLoading(false);
    }
  };

  const multiplier =
    selectedBotId === p1Id
      ? totalPool > 0 && pool1 > 0
        ? (1 + pool2 / pool1).toFixed(2)
        : '1.00'
      : totalPool > 0 && pool2 > 0
        ? (1 + pool1 / pool2).toFixed(2)
        : '1.00';

  const show = match?.status === 'pending';
  const hasBet = !!poolData?.myPrediction;
  const canBet = !hasBet && secondsLeft > 0 && session;

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] w-full max-w-2xl px-4"
      >
        <div className="rounded-xl border border-zinc-700 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
              Predict the winner
            </span>
            <div className="flex items-center gap-2 font-mono text-lg font-black text-primary tabular-nums">
              {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="p-4 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedBotId(p1Id)}
              disabled={!canBet}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                selectedBotId === p1Id
                  ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(255,45,45,0.2)]'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 disabled:opacity-50'
              }`}
            >
              <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">
                Red corner
              </div>
              <div className="text-lg font-bold text-white uppercase tracking-tight">
                {p1?.name ?? 'Fighter 1'}
              </div>
              <div className="mt-2 text-xs text-zinc-500 font-mono">
                Pool: <span className="text-amber-500">{pool1.toLocaleString()} Sparks</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBotId(p2Id)}
              disabled={!canBet}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                selectedBotId === p2Id
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 disabled:opacity-50'
              }`}
            >
              <div className="font-mono text-[10px] text-blue-400 uppercase tracking-widest mb-1">
                Blue corner
              </div>
              <div className="text-lg font-bold text-white uppercase tracking-tight">
                {p2?.name ?? 'Fighter 2'}
              </div>
              <div className="mt-2 text-xs text-zinc-500 font-mono">
                Pool: <span className="text-amber-500">{pool2.toLocaleString()} Sparks</span>
              </div>
            </button>
          </div>

          {hasBet ? (
            <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50 text-center">
              <p className="text-sm text-zinc-400">
                You bet <span className="text-amber-500 font-bold">{poolData.myPrediction?.amount} Sparks</span> on{' '}
                {poolData.myPrediction?.predicted_bot_id === p1Id ? p1?.name : p2?.name}.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 pb-2 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={MIN_BET}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ${MIN_BET} Sparks`}
                  disabled={!canBet}
                  className="w-32 rounded-lg bg-black/40 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary disabled:opacity-50"
                />
                {selectedBotId && (
                  <span className="text-xs text-zinc-500 font-mono">
                    Est. return: <span className="text-amber-500">{multiplier}x</span>
                  </span>
                )}
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {balanceLoading ? '…' : `${sparkBalance.toLocaleString()} Sparks`}
                </span>
              </div>
              {error && (
                <p className="px-4 pb-2 text-xs text-red-400 font-mono">{error}</p>
              )}
              <div className="p-4 pt-0">
                <motion.button
                  type="button"
                  onClick={handleLockIn}
                  disabled={!canBet || !selectedBotId || Number(amount) < MIN_BET || loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-mono text-sm font-black uppercase tracking-widest text-white hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Lock in prediction
                </motion.button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
