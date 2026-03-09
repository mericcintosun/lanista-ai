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
      if (ms <= 0) {
        setTimeLeft('Deploying...');
        return;
      }
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
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-8 relative overflow-hidden group flex-1 flex flex-col backdrop-blur-3xl bg-blue-500/5 border border-blue-500/20"
      >
        <h3 className="text-xs font-mono uppercase text-blue-400 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse" />
          Lobby Phase
        </h3>

        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide pr-2">
          {matches.length > 0 ? (
            matches.map((match) => (
              <div
                key={match.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/game-arena/${match.id}`)}
                className="block group/item cursor-pointer"
              >
                <div className="flex items-center justify-between p-8 bg-blue-500/5 border border-blue-500/15 group-hover/item:border-blue-500/40 transition-all relative overflow-hidden rounded-2xl">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-8 w-full justify-between relative z-10">
                    <div className="flex items-center gap-6 text-right flex-1 justify-end min-w-0">
                      <div className="min-w-0">
                        <Link to={`/agent/${match.player_1_id}`} onClick={(e) => e.stopPropagation()} className="font-black text-white text-base md:text-xl tracking-tighter italic uppercase hover:text-blue-400 transition-colors block truncate">{match.player_1?.name}</Link>
                        <p className="text-xs font-mono text-blue-400/80 uppercase tracking-[0.2em] truncate mt-1 animate-pulse">
                          Predictions Open
                        </p>
                      </div>
                      <img
                        src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                        alt=""
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900 border-2 border-blue-500/30 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] content-cover"
                      />
                    </div>

                    <div className="flex flex-col items-center justify-center min-w-[80px] shrink-0 gap-2">
                      <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                        {match.lobby_ends_at ? <Countdown endsAt={match.lobby_ends_at} /> : 'Arming'}
                      </span>
                      <div className="text-blue-500 font-black italic text-2xl opacity-40 tracking-[0.2em]">VS</div>
                      <span className="font-mono text-[10px] text-blue-400/60 uppercase tracking-widest mt-1 group-hover/item:text-blue-400 transition-colors">
                        Join Lobby
                      </span>
                    </div>

                    <div className="flex items-center gap-6 flex-1 text-left min-w-0">
                      <img
                        src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                        alt=""
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900 border-2 border-blue-500/30 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] content-cover"
                      />
                      <div className="min-w-0">
                        <Link to={`/agent/${match.player_2_id}`} onClick={(e) => e.stopPropagation()} className="font-black text-white text-base md:text-xl tracking-tighter italic uppercase hover:text-blue-400 transition-colors block truncate">{match.player_2?.name}</Link>
                         <p className="text-xs font-mono text-blue-400/80 uppercase tracking-[0.2em] truncate mt-1 animate-pulse">
                          Predictions Open
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] border border-dashed border-blue-500/20 rounded-xl bg-blue-500/5">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                <Clock className="w-8 h-8 text-blue-400/70 relative opacity-80" />
              </div>
              <div className="font-mono text-xs text-warm/70 uppercase tracking-[0.2em] text-center">
                <span className="block font-black text-blue-400/80">Lobby Empty</span>
                <span className="block text-warm/50 mt-1 italic text-xs sm:text-sm">Waiting for match initialization...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
