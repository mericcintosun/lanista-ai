import { Zap } from 'lucide-react';
import { useSparkBalance } from '../../hooks/useSparkBalance';

interface SparkBalanceProps {
  session: { access_token: string; user: { id: string } } | null;
  onOpenStore: () => void;
}

export function SparkBalance({ session, onOpenStore }: SparkBalanceProps) {
  const { balance, loading } = useSparkBalance(session);

  return (
    <button
      type="button"
      onClick={onOpenStore}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/30 transition-all font-mono text-sm"
      title="Spark balance – click to buy more"
    >
      <Zap className="w-4 h-4" />
      {loading ? (
        <span className="w-8 h-4 bg-white/10 rounded animate-pulse" />
      ) : (
        <span className="font-bold">{balance.toLocaleString()}</span>
      )}
      <span className="text-amber-500/80 text-xs uppercase tracking-wider">Spark</span>
    </button>
  );
}
