import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { Match } from '@lanista/types';
import { useEffect, useState } from 'react';

interface LobbyEngagementsProps {
  matches: Match[];
}

function Countdown({ endsAt }: { endsAt?: Date | string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endsAt) return;
    const updateCountdown = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) { setTimeLeft('Deploying...'); return; }
      const s = Math.ceil(ms / 1000);
      setTimeLeft(`T-${s}s`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return <span>{timeLeft}</span>;
}

export function LobbyEngagements({ matches }: LobbyEngagementsProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 relative overflow-hidden group flex flex-col backdrop-blur-3xl bg-[#0a1628]/60 border border-[#1e3a5f]/50"
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-24 bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <h3 className="text-[10px] sm:text-xs font-mono uppercase text-blue-400/70 tracking-[0.25em] mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
          Lobby Phase
          {matches.length > 0 && (
            <span className="ml-auto font-mono text-[10px] text-blue-400/40 tabular-nums">
              {matches.length} pending
            </span>
          )}
        </h3>

        <div className="space-y-2 sm:space-y-3 relative z-10">
          {matches.length > 0 ? (
            matches.map((match) => (
              <div
                key={match.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/game-arena/${match.id}`)}
                className="block group/item cursor-pointer"
              >
                <div className="flex items-center p-3 sm:p-4 bg-[#0d1f3c]/50 border border-[#1e3a5f]/40 group-hover/item:border-blue-500/30 group-hover/item:bg-[#0d1f3c]/70 transition-all duration-200 relative overflow-hidden rounded-lg sm:rounded-xl">
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />

                  {/* P1 */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end text-right min-w-0">
                    <div className="min-w-0">
                      <Link to={`/agent/${match.player_1_id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-white text-xs sm:text-sm tracking-tight italic uppercase hover:text-blue-300 transition-colors block truncate">
                        {match.player_1?.name}
                      </Link>
                      <p className="text-[10px] font-mono text-blue-400/60 uppercase tracking-[0.15em] truncate mt-0.5 animate-pulse">
                        Predictions Open
                      </p>
                    </div>
                    <img
                      src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                      alt=""
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900 border border-blue-500/20 p-0.5 shadow-[0_0_12px_rgba(59,130,246,0.1)] shrink-0"
                    />
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center justify-center mx-3 sm:mx-4 shrink-0 gap-1">
                    <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
                      {match.lobby_ends_at ? <Countdown endsAt={match.lobby_ends_at} /> : 'Arming'}
                    </span>
                    <span className="text-blue-500/50 font-black italic text-sm sm:text-base tracking-[0.15em]">VS</span>
                    <span className="font-mono text-[9px] text-blue-400/40 uppercase tracking-widest group-hover/item:text-blue-400/70 transition-colors">
                      Join
                    </span>
                  </div>

                  {/* P2 */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                    <img
                      src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                      alt=""
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900 border border-blue-500/20 p-0.5 shadow-[0_0_12px_rgba(59,130,246,0.1)] shrink-0"
                    />
                    <div className="min-w-0">
                      <Link to={`/agent/${match.player_2_id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-white text-xs sm:text-sm tracking-tight italic uppercase hover:text-blue-300 transition-colors block truncate">
                        {match.player_2?.name}
                      </Link>
                      <p className="text-[10px] font-mono text-blue-400/60 uppercase tracking-[0.15em] truncate mt-0.5 animate-pulse">
                        Predictions Open
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] border border-dashed border-blue-500/15 rounded-lg sm:rounded-xl bg-blue-500/[0.02]">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-blue-500/8 blur-xl rounded-full" />
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/40 relative" />
              </div>
              <div className="font-mono text-[10px] sm:text-xs text-warm/50 uppercase tracking-[0.2em] text-center">
                <span className="block font-black text-blue-400/50">Lobby Empty</span>
                <span className="block text-warm/30 mt-1 italic text-[10px] sm:text-xs">Waiting for match initialization...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
