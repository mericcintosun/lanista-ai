import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface AgentBalanceProps {
  address?: string;
}

export function AgentBalance({ address }: AgentBalanceProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    async function fetchBalance() {
      if (!address) return;
      try {
        const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
        const b = await provider.getBalance(address);
        setBalance(ethers.formatEther(b));
      } catch (err) {
        console.error('Balance fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // 30s poller
    return () => clearInterval(interval);
  }, [address]);

  if (!address) return null;

  const numBal = balance ? parseFloat(balance) : 0;
  const isLow = numBal < 0.01;

  return (
    <div className="font-mono text-xs uppercase tracking-widest bg-transparent px-3 py-1.5 rounded-md border border-red-900/30 flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-zinc-600 animate-pulse' : isLow ? 'bg-yellow-500' : 'bg-[#00FF00]'}`} />
      <span className="text-zinc-500">ENERGY (AVAX):</span>
      <span className={isLow ? 'text-yellow-500 font-bold' : 'text-white'}>
        {loading ? '...' : numBal.toFixed(4)}
      </span>
    </div>
  );
}
