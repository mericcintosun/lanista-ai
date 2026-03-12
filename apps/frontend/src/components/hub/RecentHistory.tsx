import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { History, ChevronRight } from 'lucide-react';
import type { Match } from '@lanista/types';

interface RecentHistoryProps {
  recentMatches: Match[];
}

export function RecentHistory({ recentMatches }: RecentHistoryProps) {
  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 relative overflow-hidden group flex-1 flex flex-col backdrop-blur-3xl bg-golden/[0.03] border border-golden/15"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 relative z-10">
          <h3 className="text-[10px] sm:text-xs font-mono uppercase text-golden/70 tracking-[0.25em] flex items-center gap-2 sm:gap-3">
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-golden/60 shrink-0" />
            Recent History
          </h3>
          {recentMatches.length > 0 && (
            <span className="font-mono text-[10px] text-golden/30 tabular-nums">
              {recentMatches.length} records
            </span>
          )}
        </div>

        {/* Table header — desktop only */}
        {recentMatches.length > 0 && (
          <div className="hidden sm:grid grid-cols-[80px_1fr_80px] md:grid-cols-[100px_1fr_32px_100px] gap-3 px-3 sm:px-4 mb-2 relative z-10">
            <span className="font-mono text-[9px] text-warm/30 uppercase tracking-widest">Date / ID</span>
            <span className="font-mono text-[9px] text-warm/30 uppercase tracking-widest text-center">Match</span>
            <span className="font-mono text-[9px] text-warm/30 uppercase tracking-widest hidden md:block" />
            <span className="font-mono text-[9px] text-warm/30 uppercase tracking-widest text-right">Action</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-1.5 sm:space-y-2 scrollbar-hide relative z-10 min-h-[200px] sm:min-h-[240px]">
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => {
              const isP1Winner = match.winner_id === match.player_1_id;
              const isP2Winner = match.winner_id === match.player_2_id;
              const hasOnChainProof = match.tx_hash && !match.tx_hash.startsWith('{');

              return (
                <div
                  key={match.id}
                  className="grid grid-cols-1 sm:grid-cols-[80px_1fr_100px] md:grid-cols-[100px_1fr_100px] gap-2 sm:gap-3 items-center p-3 sm:p-4 bg-golden/[0.025] border border-golden/8 hover:border-golden/20 hover:bg-golden/[0.04] rounded-lg sm:rounded-xl transition-all duration-200 group/row"
                >
                  {/* Date + Match ID */}
                  <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5">
                    <span className="font-mono text-[10px] sm:text-xs text-warm/50 uppercase tracking-tight tabular-nums">
                      {new Date(match.created_at || '').toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    <span className="font-mono text-[9px] text-warm/30 uppercase tracking-tight">
                      #{match.id.substring(0, 7)}
                    </span>
                    {/* Mobile: on-chain indicator */}
                    {hasOnChainProof && (
                      <span className="sm:hidden ml-auto flex items-center gap-1 px-1.5 py-0.5 bg-secondary/10 rounded-full border border-secondary/20">
                        <div className="w-1 h-1 rounded-full bg-secondary" />
                        <span className="text-[9px] font-mono text-secondary uppercase font-bold">On-chain</span>
                      </span>
                    )}
                  </div>

                  {/* Match Content */}
                  <div className="flex items-center justify-center gap-2 sm:gap-4 min-w-0">
                    {/* P1 */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end min-w-0">
                      {match.player_1_id ? (
                        <Link
                          to={`/agent/${match.player_1_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[11px] sm:text-sm font-black uppercase italic tracking-tight truncate min-w-0 transition-colors hover:text-primary ${
                            isP1Winner ? 'text-white' : 'text-zinc-600'
                          }`}
                        >
                          {match.player_1?.name}
                        </Link>
                      ) : (
                        <span className={`text-[11px] sm:text-sm font-black uppercase italic tracking-tight truncate min-w-0 ${isP1Winner ? 'text-white' : 'text-zinc-600'}`}>
                          {match.player_1?.name}
                        </span>
                      )}
                      <img
                        src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`}
                        alt=""
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border shrink-0 object-cover ${isP1Winner ? 'border-golden/30 opacity-100' : 'border-white/5 opacity-40'}`}
                      />
                    </div>

                    {/* VS + on-chain proof (desktop) */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0 px-1 sm:px-2">
                      <span className="text-[10px] sm:text-xs font-black italic text-warm/30 tracking-tighter uppercase">
                        VS
                      </span>
                      {hasOnChainProof && (
                        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-secondary/10 rounded-full border border-secondary/15">
                          <div className="w-1 h-1 rounded-full bg-secondary" />
                          <span className="text-[8px] sm:text-[9px] font-mono text-secondary uppercase font-bold tracking-wide">On-chain</span>
                        </div>
                      )}
                    </div>

                    {/* P2 */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 text-left min-w-0">
                      <img
                        src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`}
                        alt=""
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border shrink-0 object-cover ${isP2Winner ? 'border-golden/30 opacity-100' : 'border-white/5 opacity-40'}`}
                      />
                      {match.player_2_id ? (
                        <Link
                          to={`/agent/${match.player_2_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[11px] sm:text-sm font-black uppercase italic tracking-tight truncate min-w-0 transition-colors hover:text-primary ${
                            isP2Winner ? 'text-white' : 'text-zinc-600'
                          }`}
                        >
                          {match.player_2?.name}
                        </Link>
                      ) : (
                        <span className={`text-[11px] sm:text-sm font-black uppercase italic tracking-tight truncate min-w-0 ${isP2Winner ? 'text-white' : 'text-zinc-600'}`}>
                          {match.player_2?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 sm:gap-2">
                    <Link
                      to={`/game-arena/${match.id}`}
                      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-golden/10 bg-golden/[0.03] hover:border-golden/30 hover:bg-golden/[0.07] transition-all text-warm/40 hover:text-golden/70 group/btn"
                    >
                      <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest font-bold hidden sm:inline">
                        Details
                      </span>
                      <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] sm:min-h-[240px] border border-dashed border-golden/15 rounded-lg sm:rounded-2xl bg-golden/[0.02] p-4">
              <History className="w-6 h-6 text-golden/20 mb-2" />
              <p className="font-mono text-[10px] sm:text-xs text-warm/40 uppercase tracking-[0.2em] text-center">
                No records indexed.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
