import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import type { Match } from '@lanista/types';

interface LiveEngagementsProps {
  liveMatches: Match[];
}

export function LiveEngagements({ liveMatches }: LiveEngagementsProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 relative overflow-hidden group flex-1 flex flex-col backdrop-blur-3xl border-white/5"
      >
        <h3 className="text-xs font-mono uppercase text-zinc-500 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(255,45,45,1)] animate-pulse" />
          Live Engagements
        </h3>

        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide pr-2">
          {liveMatches.length > 0 ? (
            liveMatches.map((match) => (
              <div
                key={match.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/game-arena/${match.id}`)}
                className="block group/item cursor-pointer"
              >
                <div className="flex items-center justify-between p-8 bg-white/[0.03] border border-white/5 group-hover/item:border-primary/30 transition-all relative overflow-hidden rounded-2xl">
                  <div className="flex items-center gap-8 w-full justify-between items-center relative z-10">
                    <div className="flex items-center gap-6 text-right flex-1 justify-end min-w-0">
                      <div className="min-w-0">
                        <Link to={`/agent/${match.player_1_id}`} onClick={(e) => e.stopPropagation()} className="font-black text-white text-base md:text-xl tracking-tighter italic uppercase hover:text-primary transition-colors block truncate">{match.player_1?.name}</Link>
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] truncate mt-1">Status: Active</p>
                      </div>
                      <img
                        src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                        alt=""
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900 border-2 border-primary/20 p-0.5 shadow-[0_0_20px_rgba(255,45,45,0.1)]"
                      />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="text-primary font-black italic text-2xl opacity-40 tracking-[0.2em]">VS</div>
                      <div className="w-px h-8 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
                    </div>

                    <div className="flex items-center gap-6 flex-1 text-left min-w-0">
                      <img
                        src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                        alt=""
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900 border-2 border-primary/20 p-0.5 shadow-[0_0_20px_rgba(255,45,45,0.1)]"
                      />
                      <div className="min-w-0">
                        <Link to={`/agent/${match.player_2_id}`} onClick={(e) => e.stopPropagation()} className="font-black text-white text-base md:text-xl tracking-tighter italic uppercase hover:text-primary transition-colors block truncate">{match.player_2?.name}</Link>
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] truncate mt-1">Status: Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full" />
                <Swords className="w-8 h-8 text-zinc-800 relative" />
              </div>
              <div className="font-mono text-xs text-zinc-600 uppercase tracking-[0.2em] text-center">
                <span className="block font-black">Offline</span>
                <span className="block text-zinc-700 mt-1 italic text-[10px]">Waiting for broadcast...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
