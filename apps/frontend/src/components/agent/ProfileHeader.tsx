import { Shield, Fingerprint, Check } from 'lucide-react';
import { TierBadge } from '../EloTier';
import { AgentBalance } from './AgentBalance';
import type { BotData } from '../../types';
import { useState } from 'react';

interface ProfileHeaderProps {
  agent: BotData;
  totalMatches: number;
}

export function ProfileHeader({ agent, totalMatches }: ProfileHeaderProps) {
  const elo = agent.elo ?? 0;
  const [copiedId, setCopiedId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const handleCopyAddress = () => {
    if (agent.wallet_address) {
      navigator.clipboard.writeText(agent.wallet_address);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const handleCopyId = () => {
    if (agent.id) {
      navigator.clipboard.writeText(agent.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-white/10 backdrop-blur-xl rounded-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="p-8 sm:p-10 relative z-10 flex flex-col md:flex-row items-center sm:items-start gap-8">
        {/* Avatar */}
        <div className="relative shrink-0 flex justify-center items-center">
          <img
            src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
            alt={agent.name}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white/5 shadow-2xl shadow-primary/20"
          />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left h-full justify-center w-full">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 w-full">
            <div className="relative inline-block">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic text-white uppercase tracking-tighter leading-[0.85] select-none relative z-10">
                {agent.name}
              </h1>
              <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.85] pointer-events-none">
                {agent.name}
              </span>
            </div>
            <div className="flex-shrink-0">
              <TierBadge elo={elo} hasPlayed={totalMatches > 0} />
            </div>
          </div>

          <div className="flex flex-wrap flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 mb-6 w-full">
            {/* AGENT ID BOX */}
            <div className="flex items-center gap-2">
              <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-md border border-white/5 flex items-center gap-2">
                <Fingerprint className="w-3 h-3 text-zinc-500" />
                <span className="hidden sm:inline">AGENT ID:</span>
                {agent.id.substring(0, 8)}...
              </div>
              <button
                onClick={handleCopyId}
                className="p-1.5 bg-zinc-900 border border-white/10 rounded hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white flex items-center gap-1"
                title="Copy Agent ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>}
                {copiedId && <span className="text-[10px] font-mono font-bold text-green-500 uppercase tracking-wider pr-1">Copied!</span>}
              </button>
            </div>

            {/* WALLET BOX */}
            {agent.wallet_address && (
              <div className="flex items-center gap-2">
                <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-md border border-white/5 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-zinc-500" />
                  <span className="hidden sm:inline">WALLET:</span>
                  {agent.wallet_address.substring(0, 6)}...{agent.wallet_address.slice(-4)}
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 bg-zinc-900 border border-white/10 rounded hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white flex items-center gap-1"
                  title="Copy Address"
                >
                  {copiedWallet ? <Check className="w-3.5 h-3.5 text-green-500" /> : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>}
                  {copiedWallet && <span className="text-[10px] font-mono font-bold text-green-500 uppercase tracking-wider pr-1">Copied!</span>}
                </button>
              </div>
            )}

            <AgentBalance address={agent.wallet_address} />

            {agent.created_at && (
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-md border border-white/5 flex items-center gap-2">
                <span className="text-zinc-600">INIT:</span>
                {new Date(agent.created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {agent.description && (
            <p className="text-zinc-400/80 text-sm sm:text-base max-w-2xl leading-relaxed italic border-l-2 border-red-500/30 pl-4">
              "{agent.description}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
