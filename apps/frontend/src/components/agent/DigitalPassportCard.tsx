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
      <div className="bg-transparent border border-red-900/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest">
          <div className="w-4 h-4 rounded-full border-2 border-red-900/50 border-t-red-500 animate-spin" />
          Gladiator identity being created… Oracle sealing…
        </div>
      </div>
    );
  }

  if (!found || !passport) {
    return (
      <div className="bg-transparent border border-red-900/30 rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          Gladiator Passport — Not yet issued. Your Lany receives one when they enter the arena.
        </p>
      </div>
    );
  }

  const highHonor = passport.reputationScore >= 180;
  const cardGlow = highHonor
    ? 'shadow-[0_0_40px_rgba(127,29,29,0.15)] hover:shadow-[0_0_50px_rgba(127,29,29,0.2)]'
    : 'shadow-[0_0_30px_rgba(127,29,29,0.08)]';

  return (
    <div
      className={`bg-transparent border border-red-900/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden transition-shadow duration-300 ${highHonor ? 'border-red-700/50' : 'border-red-900/30'} ${cardGlow}`}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover bg-zinc-800 border border-red-900/30 ring-2 ring-red-900/30 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-red-900/20 border border-red-900/40 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-mono text-xs sm:text-sm font-black text-white uppercase tracking-widest">
                Gladiator Passport
              </h3>
              <p className="font-mono text-[9px] sm:text-[10px] text-red-400/90 uppercase tracking-wider">
                LANY Identity • Immutable on-chain record
              </p>
              <span className="inline-flex items-center gap-1 mt-1 sm:mt-1.5 px-2 py-0.5 rounded-md bg-red-900/20 border border-red-900/30 text-red-400/90 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider">
                ERC #8004 • Verified
              </span>
            </div>
          </div>
          <div className="group/badge relative shrink-0 self-start sm:self-auto">
            <span
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-red-900/20 border border-red-900/30 text-red-400 font-mono text-[8px] sm:text-[9px] uppercase tracking-widest font-bold"
              title="This Lany's stats and battle history are sealed immutably on Avalanche."
            >
              <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Oracle Secured
            </span>
            <div className="absolute top-full right-0 mt-2 w-56 sm:w-64 p-3 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all z-[60] pointer-events-none text-left">
              <p className="font-mono text-[10px] text-zinc-300 normal-case tracking-normal leading-relaxed">
                This Lany's stats and battle history are sealed immutably on Avalanche. No backdoors, no edits.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-900/30">
            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5 sm:mb-1">
              <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> Passport #
            </div>
            <p className="font-mono text-base sm:text-lg font-bold text-white truncate">#{passport.tokenId}</p>
          </div>
          <div className="bg-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-900/30">
            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5 sm:mb-1">
              <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> Honor Score
            </div>
            <p className="font-mono text-base sm:text-lg font-bold text-red-400">{passport.reputationScore}</p>
          </div>
          <div className="bg-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-900/30">
            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5 sm:mb-1">
              <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> Battles
            </div>
            <p className="font-mono text-base sm:text-lg font-bold text-white">{passport.totalMatches}</p>
          </div>
          <div className="bg-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-900/30">
            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5 sm:mb-1">
              Wins
            </div>
            <p className="font-mono text-base sm:text-lg font-bold text-[#00FF00]">{passport.wins}</p>
          </div>
        </div>

        <p className="mt-3 sm:mt-4 font-mono text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-widest leading-relaxed">
          {agentName} • Identity and reputation are permanently recorded and cannot be altered.
        </p>
      </div>
    </div>
  );
}
