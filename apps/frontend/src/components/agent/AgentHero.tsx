import { useState, useEffect } from 'react';
import { Shield, Fingerprint, Check, Trophy, Swords, Target, BadgeCheck, Copy } from 'lucide-react';
import { TierBadge, TierProgressBar } from '../EloTier';
import { getEloTier } from '../../lib/elo';
import { AgentBalance } from './AgentBalance';
import { API_URL } from '../../lib/api';
import type { BotData } from '../../types';

interface AgentHeroProps {
  agent: BotData;
  history: any[];
}

export function AgentHero({ agent, history }: AgentHeroProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [passport, setPassport] = useState<any>(null);

  const elo = agent.elo ?? 0;
  const wins = agent.true_wins ?? history.filter(m => m.status === 'finished' && m.winner_id === agent.id).length;
  const totalMatches = agent.true_total_matches ?? agent.total_matches ?? history.filter(m => m.status === 'finished').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const tier = getEloTier(elo, totalMatches > 0);
  const tierBorder = tier.border.replace('/40', '/30');

  useEffect(() => {
    if (!agent.id) return;
    fetch(`${API_URL}/agents/${agent.id}/passport`)
      .then(res => res.json())
      .then(data => {
        if (data.passport) setPassport(data.passport);
      })
      .catch(() => {});
  }, [agent.id, setPassport]);

  const copy = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HERO CARD ── */}
      <div className={`bg-transparent border ${tierBorder} p-6 sm:p-8 rounded-[2rem] relative overflow-visible`}>
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          {/* Left: Avatar + Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 flex-1 min-w-0">
            {/* Avatar */}
            <div className="shrink-0 relative">
              <div className={`absolute -inset-2 ${tier.bg} blur-2xl rounded-full opacity-50`} />
              <img
                src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                alt={agent.name}
                className={`w-32 h-32 rounded-3xl object-cover border-2 ${tierBorder} shadow-2xl relative`}
              />
            </div>

            {/* Name, description, details */}
            <div className="flex-1 space-y-4 text-center sm:text-left min-w-0">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white uppercase italic tracking-tighter mb-2">
                  {agent.name}
                </h1>
                {agent.description && (
                  <p className={`text-zinc-500 text-sm max-w-xl italic mt-2 border-l-2 ${tierBorder} pl-4`}>
                    "{agent.description}"
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <div className={`flex items-center bg-transparent border ${tierBorder} rounded-lg px-3 py-1.5 gap-2`}>
                    <Fingerprint className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">CORE ID: {agent.id.substring(0, 10)}...</span>
                    <button onClick={() => copy(agent.id, setCopiedId)} className="text-zinc-600 hover:text-white transition-colors">
                      {copiedId ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {agent.wallet_address && (
                    <div className={`flex items-center bg-transparent border ${tierBorder} rounded-lg px-3 py-1.5 gap-2`}>
                      <Shield className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">WALLET: {agent.wallet_address.substring(0, 6)}...</span>
                      <button onClick={() => agent.wallet_address && copy(agent.wallet_address, setCopiedWallet)} className="text-zinc-600 hover:text-white transition-colors">
                        {copiedWallet ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <AgentBalance address={agent.wallet_address} />
                  {agent.created_at && (
                    <div className={`bg-transparent px-3 py-1.5 rounded-lg border ${tierBorder} font-mono text-xs text-zinc-500 uppercase tracking-widest`}>
                      INIT: {new Date(agent.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Rank panel - vertically centered */}
          <div className="shrink-0 flex justify-center md:justify-end">
            <TierBadge elo={elo} hasPlayed={totalMatches > 0} prominent />
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className={`grid grid-cols-2 md:grid-cols-4 bg-transparent border ${tierBorder} rounded-2xl overflow-hidden`}>
        <div className={`p-6 border-r ${tierBorder} flex flex-col items-center text-center group hover:bg-white/[0.02] transition-colors`}>
          <Trophy className={`w-4 h-4 mb-3 ${tier.color} transition-colors`} />
          <span className="text-2xl font-black text-white tabular-nums">{elo}</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mt-1">Global ELO</span>
        </div>
        <div className={`p-6 border-r ${tierBorder} flex flex-col items-center text-center group hover:bg-white/[0.02] transition-colors`}>
          <Swords className={`w-4 h-4 mb-3 ${tier.color} transition-colors`} />
          <span className="text-2xl font-black text-white tabular-nums">{totalMatches}</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mt-1">Total Matches</span>
        </div>
        <div className={`p-6 border-r ${tierBorder} flex flex-col items-center text-center group hover:bg-white/[0.02] transition-colors`}>
          <Target className="w-4 h-4 text-zinc-500 mb-3 group-hover:text-emerald-400 transition-colors" />
          <span className="text-2xl font-black text-emerald-400 tabular-nums">{winRate}%</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mt-1">Win Rate</span>
        </div>
        <div className="p-6 flex flex-col items-center text-center group hover:bg-white/[0.02] transition-colors">
          <Shield className={`w-4 h-4 mb-3 ${tier.color} transition-colors`} />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-400">{wins}</span>
            <span className="text-zinc-600 font-black text-xl">-</span>
            <span className={`text-2xl font-black ${tier.color} opacity-80`}>{totalMatches - wins}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mt-1">W/L Record</span>
        </div>
      </div>

      {/* ── PASSPORT & PROGRESS ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Passport Card */}
        <div className={`md:col-span-8 bg-transparent p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl md:rounded-[2rem] border ${tierBorder} relative overflow-hidden group`}>
          <div className={`absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 ${tier.bg} blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 relative z-10">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className={`w-12 h-12 sm:w-14 md:w-16 sm:h-14 md:h-16 rounded-xl sm:rounded-2xl ${tier.bg} ${tier.border} flex items-center justify-center shrink-0`}>
                <Shield className={`w-6 h-6 sm:w-7 md:w-8 sm:h-7 md:h-8 ${tier.color}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Gladiator Passport</h3>
                <p className={`text-[10px] sm:text-xs font-mono ${tier.color} opacity-70 uppercase tracking-widest mt-0.5 sm:mt-1`}>Lany Identity • Immutable On-Chain Record</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 ${tier.bg} ${tier.border} rounded-lg sm:rounded-xl shrink-0 self-start sm:self-auto`}>
              <BadgeCheck className={`w-4 h-4 sm:w-5 sm:h-5 ${tier.color}`} />
              <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-widest font-black">On-chain</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
            <div className={`bg-transparent p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${tierBorder}`}>
              <span className="block text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5 sm:mb-1">Passport #</span>
              <span className="text-lg sm:text-xl md:text-2xl font-black text-white italic truncate block">#{passport?.tokenId || '8004'}</span>
            </div>
            <div className={`bg-transparent p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${tierBorder}`}>
              <span className="block text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5 sm:mb-1">Honor Score</span>
              <span className={`text-lg sm:text-xl md:text-2xl font-black ${tier.color} italic`}>{passport?.reputationScore || '000'}</span>
            </div>
            <div className={`bg-transparent p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${tierBorder}`}>
              <span className="block text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5 sm:mb-1">Battles</span>
              <span className="text-lg sm:text-xl md:text-2xl font-black text-white italic">{totalMatches}</span>
            </div>
            <div className={`bg-transparent p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${tierBorder}`}>
              <span className="block text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5 sm:mb-1">Wins</span>
              <span className="text-lg sm:text-xl md:text-2xl font-black text-emerald-400 italic">{wins}</span>
            </div>
          </div>
          
          <p className="mt-4 sm:mt-6 md:mt-8 text-[8px] sm:text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black italic leading-relaxed">
            Identity and reputation are permanently recorded and cannot be altered.
          </p>
        </div>

        {/* Level/Tier Section */}
        <div className={`md:col-span-4 bg-transparent border ${tierBorder} p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl md:rounded-[2rem] flex flex-col justify-center items-center text-center`}>
           <TierProgressBar elo={elo} hasPlayed={totalMatches > 0} />
           <p className="mt-4 text-xs font-mono text-zinc-500 uppercase tracking-widest">Arena Progression Status</p>
        </div>
      </div>
    </div>
  );
}
