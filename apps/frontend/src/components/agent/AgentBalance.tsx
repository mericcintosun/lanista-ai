import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface AgentBalanceProps {
  address?: string;
  initialBalance?: string;
}

export function AgentBalance({ address, initialBalance }: AgentBalanceProps) {
  const [balance, setBalance] = useState<string | null>(initialBalance ?? null);
  const [loading, setLoading] = useState(!initialBalance);

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
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [address]);

  if (!address) return null;

  const numBal = balance ? parseFloat(balance) : 0;
  const isLow = numBal < 0.01;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px]"
      style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${loading ? 'animate-pulse' : ''}`}
        style={{ background: loading ? '#52525b' : isLow ? '#eab308' : '#22c55e' }}
      />
      <span className="text-zinc-500">AVAX</span>
      <span style={{ color: isLow ? '#eab308' : '#ffffff', fontWeight: isLow ? 700 : 400 }}>
        {loading ? '…' : numBal.toFixed(4)}
      </span>
    </div>
  );
}
