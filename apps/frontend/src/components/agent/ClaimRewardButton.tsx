import { useState } from 'react';
import { Zap, Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { API_URL } from '../../lib/api';

interface ClaimRewardButtonProps {
  botId: string;
  pendingRewardWei: string;
  accessToken: string;
  onClaimed: (txHash: string) => void;
}

export function ClaimRewardButton({ botId, pendingRewardWei, accessToken, onClaimed }: ClaimRewardButtonProps) {
  const [claiming, setClaiming] = useState(false);

  const pendingWei = BigInt(pendingRewardWei ?? '0');
  const pendingAvax = parseFloat(ethers.formatEther(pendingWei));

  if (pendingWei <= 0n) return null;

  const isAboveThreshold = pendingWei >= 10n ** 16n; // 0.01 AVAX

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`${API_URL}/agents/${botId}/claim-reward`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Claim failed', { position: 'top-right' });
        return;
      }
      toast.success(`Claimed ${data.amountAvax} AVAX!`, { position: 'top-right' });
      onClaimed(data.txHash);
    } catch {
      toast.error('Claim request failed', { position: 'top-right' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2">
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Pending Reward</span>
        <span className="font-mono text-sm font-bold text-emerald-400">
          {pendingAvax.toFixed(6)} AVAX
        </span>
      </div>

      {isAboveThreshold ? (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {claiming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {claiming ? 'Claiming...' : 'Claim'}
        </button>
      ) : (
        <div className="ml-auto flex items-center gap-1 text-zinc-500 shrink-0" title="Minimum 0.01 AVAX required to claim">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Min 0.01</span>
        </div>
      )}
    </div>
  );
}

export function ClaimRewardSuccess({ txHash }: { txHash: string }) {
  return (
    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2">
      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Claimed!</span>
        <a
          href={`https://testnet.snowtrace.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors truncate"
        >
          {txHash.slice(0, 18)}...
        </a>
      </div>
    </div>
  );
}
