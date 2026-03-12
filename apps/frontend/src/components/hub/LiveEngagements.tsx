import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { Swords } from 'lucide-react';
import type { Match } from '@lanista/types';

interface LiveEngagementsProps {
  liveMatches: Match[];
}

export function LiveEngagements({ liveMatches }: LiveEngagementsProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 relative overflow-hidden group flex flex-col backdrop-blur-3xl bg-primary/[0.04] border border-primary/15"
      >
        {/* Ambient glow */}
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <h3 className="text-[10px] sm:text-xs font-mono uppercase text-primary/80 tracking-[0.25em] mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(223,127,62,0.7)] animate-pulse" />
          Live Engagements
          {liveMatches.length > 0 && (
            <span className="ml-auto font-mono text-[10px] text-primary/40 tabular-nums">
              {liveMatches.length} live
            </span>
          )}
        </h3>

        <div className="space-y-2 sm:space-y-3 relative z-10">
          {liveMatches.length > 0 ? (
            liveMatches.map((match) => (
              <div
                key={match.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/game-arena/${match.id}`)}
                onMouseEnter={prefetchGameHtml}
                onTouchStart={prefetchGameHtml}
                className="block group/item cursor-pointer"
              >
                <div className="flex items-center p-3 sm:p-4 bg-primary/[0.04] border border-primary/10 group-hover/item:border-primary/30 group-hover/item:bg-primary/[0.07] transition-all duration-200 relative overflow-hidden rounded-lg sm:rounded-xl">
                  {/* Top shine on hover */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />

                  {/* P1 */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end text-right min-w-0">
                    <div className="min-w-0">
                      <Link
                        to={`/agent/${match.player_1_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-white text-xs sm:text-sm tracking-tight italic uppercase hover:text-primary transition-colors block truncate"
                      >
                        {match.player_1?.name}
                      </Link>
                      <p className="text-[10px] font-mono text-warm/40 uppercase tracking-[0.12em] truncate mt-0.5">
                        Active
                      </p>
                    </div>
                    <img
                      src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                      alt=""
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900 border border-primary/20 p-0.5 shadow-[0_0_12px_rgba(223,127,62,0.08)] shrink-0"
                    />
                  </div>

                  {/* VS divider */}
                  <div className="flex flex-col items-center mx-3 sm:mx-4 shrink-0 gap-1">
                    <span className="text-primary/50 font-black italic text-sm sm:text-base tracking-[0.15em]">VS</span>
                    <div className="w-px h-4 bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
                  </div>

                  {/* P2 */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                    <img
                      src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                      alt=""
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900 border border-primary/20 p-0.5 shadow-[0_0_12px_rgba(223,127,62,0.08)] shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/agent/${match.player_2_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-white text-xs sm:text-sm tracking-tight italic uppercase hover:text-primary transition-colors block truncate"
                      >
                        {match.player_2?.name}
                      </Link>
                      <p className="text-[10px] font-mono text-warm/40 uppercase tracking-[0.12em] truncate mt-0.5">
                        Active
                      </p>
                    </div>
                  </div>

                  {/* Watch CTA */}
                  <div className="ml-2 sm:ml-3 shrink-0">
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-primary/40 group-hover/item:text-primary/70 transition-colors block text-right">
                      Watch →
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] border border-dashed border-primary/15 rounded-lg sm:rounded-xl bg-primary/[0.02]">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-primary/8 blur-xl rounded-full" />
                <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-700 relative" />
              </div>
              <div className="font-mono text-[10px] sm:text-xs text-warm/50 uppercase tracking-[0.2em] text-center">
                <span className="block font-black text-warm/40">Offline</span>
                <span className="block text-warm/30 mt-1 italic text-[10px] sm:text-xs">Waiting for broadcast...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
