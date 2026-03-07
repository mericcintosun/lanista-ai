import { useState, useEffect } from 'react';
import { Shield, Award, Swords, Hash, BadgeCheck } from 'lucide-react';
import { API_URL } from '../../lib/api';

export interface PassportData {
  tokenId: string;
  ownerWallet: string;
  reputationScore: number;
  totalMatches: number;
  wins: number;
  metadataURI: string;
  createdAt: string;
}

interface DigitalPassportCardProps {
  agentId: string | null;
  agentName: string;
  walletAddress?: string | null;
  avatarUrl?: string | null;
}

export function DigitalPassportCard({ agentId, agentName, walletAddress, avatarUrl }: DigitalPassportCardProps) {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/agents/${agentId}/passport`);
        const data = await res.json();
        if (cancelled) return;
        setFound(data.found === true);
        if (data.passport) setPassport(data.passport);
      } catch {
        if (!cancelled) setFound(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-cyan-500/20 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-500/50 border-t-cyan-500 animate-spin" />
          Gladiator identity being created… Oracle sealing…
        </div>
      </div>
    );
  }

  if (!found || !passport) {
    return (
      <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          Gladiator Passport — Not yet issued. Your Lany receives one when they enter the arena.
        </p>
      </div>
    );
  }

  const highHonor = passport.reputationScore >= 180;
  const cardGlow = highHonor
    ? 'shadow-[0_0_40px_rgba(6,182,212,0.12)] hover:shadow-[0_0_50px_rgba(6,182,212,0.18)]'
    : 'shadow-[0_0_30px_rgba(6,182,212,0.08)]';

  return (
    <div
      className={`bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border rounded-2xl p-6 sm:p-8 relative overflow-hidden transition-shadow duration-300 ${highHonor ? 'border-cyan-500/40' : 'border-cyan-500/30'} ${cardGlow}`}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover bg-zinc-800 border border-white/10 ring-2 ring-cyan-500/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <Shield className="w-7 h-7 text-cyan-400" />
              </div>
            )}
            <div>
              <h3 className="font-mono text-sm font-black text-white uppercase tracking-widest">
                Gladiator Passport
              </h3>
              <p className="font-mono text-[10px] text-cyan-400/90 uppercase tracking-wider">
                LANY Identity • Immutable on-chain record
              </p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400/90 font-mono text-[9px] uppercase tracking-wider">
                ERC #8004 • Verified
              </span>
            </div>
          </div>
          <div className="group/badge relative shrink-0">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[9px] uppercase tracking-widest font-bold"
              title="This Lany's stats and battle history are sealed immutably on Avalanche."
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              Oracle Secured
            </span>
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all z-[60] pointer-events-none text-left">
              <p className="font-mono text-[10px] text-zinc-300 normal-case tracking-normal leading-relaxed">
                This Lany's stats and battle history are sealed immutably on Avalanche. No backdoors, no edits.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">
              <Hash className="w-3.5 h-3.5" /> Passport #
            </div>
            <p className="font-mono text-lg font-bold text-white">#{passport.tokenId}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">
              <Award className="w-3.5 h-3.5" /> Honor Score
            </div>
            <p className="font-mono text-lg font-bold text-cyan-400">{passport.reputationScore}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">
              <Swords className="w-3.5 h-3.5" /> Battles
            </div>
            <p className="font-mono text-lg font-bold text-white">{passport.totalMatches}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">
              Wins
            </div>
            <p className="font-mono text-lg font-bold text-[#00FF00]">{passport.wins}</p>
          </div>
        </div>

        <p className="mt-4 font-mono text-[9px] text-zinc-600 uppercase tracking-widest">
          {agentName} • Identity and reputation are permanently recorded and cannot be altered.
        </p>
      </div>
    </div>
  );
}
