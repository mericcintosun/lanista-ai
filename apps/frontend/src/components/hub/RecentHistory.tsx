import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { History, ChevronRight } from 'lucide-react';
import type { Match } from '@lanista/types';

interface RecentHistoryProps {
  recentMatches: Match[];
}

export function RecentHistory({ recentMatches }: RecentHistoryProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden group flex-1 flex flex-col backdrop-blur-3xl bg-golden/5 border border-golden/20"
      >
        <h3 className="text-[10px] sm:text-xs font-mono uppercase text-golden/90 tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-8 md:mb-10 flex items-center gap-2 sm:gap-3 relative z-10">
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-golden shrink-0" />
          Recent History
        </h3>

        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-2 sm:space-y-3 scrollbar-hide relative z-10 min-h-[240px] sm:min-h-[300px]">
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 p-4 sm:p-6 bg-golden/5 border border-golden/10 rounded-xl sm:rounded-2xl hover:bg-golden/10 transition-all cursor-pointer group/row"
                onClick={() => navigate(`/game-arena/${match.id}`)}
              >
                {/* Date & ID - top on mobile, left on desktop */}
                <div className="flex items-center gap-3 sm:gap-6 sm:w-48 shrink-0 order-1 sm:order-1">
                  <div className="font-mono text-[10px] sm:text-xs text-warm/70 uppercase tracking-[0.15em] sm:tracking-[0.2em] tabular-nums">
                    {new Date(match.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                  <span className="font-mono text-[9px] sm:text-[10px] text-warm/50 uppercase tracking-tight">#{match.id.substring(0, 8)}</span>
                </div>

                {/* Match Content */}
                <div className="flex-1 flex flex-row items-center justify-center gap-3 sm:gap-8 md:gap-12 px-2 sm:px-4 md:px-8 order-2 sm:order-2 min-w-0">
                  <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4 text-right w-full sm:w-auto">
                    {match.player_1_id ? (
                      <Link
                        to={`/agent/${match.player_1_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs sm:text-sm md:text-base font-black uppercase italic tracking-tight transition-colors hover:text-primary truncate min-w-0 ${match.winner_id === match.player_1_id ? 'text-white' : 'text-zinc-600'}`}
                      >
                        {match.player_1?.name}
                      </Link>
                    ) : (
                      <span className={`text-xs sm:text-sm md:text-base font-black uppercase italic tracking-tight truncate min-w-0 ${match.winner_id === match.player_1_id ? 'text-white' : 'text-zinc-600'}`}>
                        {match.player_1?.name}
                      </span>
                    )}
                    <img src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/5 opacity-80 shrink-0 object-cover" />
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-[10px] sm:text-xs font-black italic text-warm/40 tracking-tighter uppercase grayscale">VS</span>
                    {match.tx_hash && !match.tx_hash.startsWith('{') && (
                      <div className="px-1.5 sm:px-2 py-0.5 bg-[#00FF00]/10 rounded-full border border-[#00FF00]/20 flex items-center gap-1 sm:gap-1.5">
                        <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[#00FF00]" />
                        <span className="text-[9px] sm:text-[10px] font-mono text-secondary uppercase font-bold tracking-[0.05em]">Secured</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 items-center justify-start gap-2 sm:gap-4 text-left w-full sm:w-auto">
                    <img src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/5 opacity-80 shrink-0 object-cover" />
                    {match.player_2_id ? (
                      <Link
                        to={`/agent/${match.player_2_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs sm:text-sm md:text-base font-black uppercase italic tracking-tight transition-colors hover:text-primary truncate min-w-0 ${match.winner_id === match.player_2_id ? 'text-white' : 'text-zinc-600'}`}
                      >
                        {match.player_2?.name}
                      </Link>
                    ) : (
                      <span className={`text-xs sm:text-sm md:text-base font-black uppercase italic tracking-tight truncate min-w-0 ${match.winner_id === match.player_2_id ? 'text-white' : 'text-zinc-600'}`}>
                        {match.player_2?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full sm:w-32 flex justify-end shrink-0 order-3 sm:order-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 group-hover/row:text-primary transition-colors">
                    <span className="font-mono text-[9px] sm:text-[10px] text-warm/60 uppercase tracking-widest font-bold hidden sm:inline">Details</span>
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warm/50 shrink-0" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[240px] sm:min-h-[300px] border border-dashed border-golden/20 rounded-xl sm:rounded-2xl bg-golden/5 p-4">
              <p className="font-mono text-[10px] sm:text-xs text-warm/60 uppercase tracking-[0.2em] sm:tracking-[0.3em] text-center">No records indexed.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
