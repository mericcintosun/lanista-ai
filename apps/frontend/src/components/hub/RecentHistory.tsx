import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import type { Match } from '@lanista/types';

interface RecentHistoryProps {
  recentMatches: Match[];
}

export function RecentHistory({ recentMatches }: RecentHistoryProps) {
  const navigate = useNavigate();

  return (
    <div className="lg:col-span-12 space-y-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/[0.02] border border-white/10 rounded-lg p-8 backdrop-blur-sm transition-colors group"
      >
        <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-[0.2em] mb-10 flex items-center gap-3">
          <History className="w-4 h-4 text-zinc-400" />
          Recent History
        </h3>

        <div className="divide-y divide-white/5">
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-6 transition-all hover:bg-white/[0.02] px-4 -mx-4 cursor-pointer group/row border-b border-white/5 last:border-0"
                onClick={() => navigate(`/game-arena/${match.id}`)}
              >
                <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-start gap-4 sm:gap-8 sm:flex-1">
                  <div className="font-mono text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest min-w-[70px]">
                    {new Date(match.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>

                  <div className="flex items-center gap-3">
                    {match.tx_hash && !match.tx_hash.startsWith('{') && (
                      <div className="flex items-center gap-2 px-2 py-0.5 sm:py-1 bg-[#00FF00]/10 border border-[#00FF00]/20 rounded">
                        <div className="w-1 h-1 rounded-full bg-[#00FF00]" />
                        <span className="text-[9px] sm:text-[10px] font-mono text-[#00FF00] uppercase font-bold tracking-[0.1em]">Secured</span>
                      </div>
                    )}
                    <span className="font-mono text-[10px] sm:text-xs text-zinc-600 uppercase tracking-[0.1em]">#{match.id.substring(0, 8)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center flex-1 sm:flex-[2] gap-4 sm:gap-10 py-2 sm:py-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
                    <span className={`text-sm sm:text-lg font-bold tracking-tighter uppercase italic truncate text-right ${match.winner_id === match.player_1_id ? 'text-white' : 'text-zinc-500'}`}>
                      {match.player_1?.name}
                    </span>
                    <img src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full opacity-60" />
                  </div>

                  <span className="text-xs sm:text-base font-mono text-zinc-800 font-black italic px-2">VS</span>

                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <img src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full opacity-60" />
                    <span className={`text-sm sm:text-lg font-bold tracking-tighter uppercase italic truncate ${match.winner_id === match.player_2_id ? 'text-white' : 'text-zinc-500'}`}>
                      {match.player_2?.name}
                    </span>
                  </div>
                </div>

                <div className="sm:w-32 flex justify-center sm:justify-end mt-2 sm:mt-0">
                  {match.tx_hash && !match.tx_hash.startsWith('{') ? (
                    <a
                      href={`https://snowtrace.io/tx/${match.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] sm:text-xs font-mono text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.1em] border-b border-white/10 hover:border-white/30"
                    >
                      Verify Record
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-600 uppercase italic">Pending...</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-lg bg-black/20">
              <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-[0.3em]">No historical combat records indexed.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
