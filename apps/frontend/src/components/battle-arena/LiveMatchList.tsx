import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { Swords, Activity, Search, ChevronLeft } from 'lucide-react';
import type { Match } from '@lanista/types';

interface LiveMatchListProps {
  matches: Match[];
}

export function LiveMatchList({ matches }: LiveMatchListProps) {
  return (
    <div className="w-full flex flex-col items-center gap-12">
      {matches.length > 0 ? (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((liveMatch) => (
            <Link key={liveMatch.id} to={`/game-arena/${liveMatch.id}`} className="group" onMouseEnter={prefetchGameHtml}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative p-10 rounded-3xl transition-all flex flex-col gap-8 overflow-hidden bg-gradient-to-br from-blue-500/10 via-transparent to-secondary/10 border border-blue-500/20 hover:border-blue-500/40"
              >
                <div className="absolute inset-0 noise pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-blue-300/80 uppercase tracking-widest">Match #{liveMatch.id.substring(0, 8)}</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-secondary uppercase tracking-widest">
                    <Activity className="w-3 h-3" /> Live Now
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center justify-end gap-3">
                    <div className="flex flex-col items-end">
                      <h4 className="font-black text-white text-xl tracking-tighter italic uppercase truncate">
                        {liveMatch.player_1?.name}
                      </h4>
                      <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                        Origin: {(liveMatch.player_1?.id ?? '').substring(0, 8)}
                      </p>
                    </div>
                    <img
                      src={liveMatch.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${liveMatch.player_1?.name ?? 'P1'}`}
                      alt={liveMatch.player_1?.name ?? 'Player 1'}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-900 border border-white/10 object-cover"
                    />
                  </div>

                  <div className="text-zinc-800 font-black italic text-xl px-2">VS</div>

                  <div className="flex-1 flex items-center justify-start gap-3">
                    <img
                      src={liveMatch.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${liveMatch.player_2?.name ?? 'P2'}`}
                      alt={liveMatch.player_2?.name ?? 'Player 2'}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-900 border border-white/10 object-cover"
                    />
                    <div className="flex flex-col items-start">
                      <h4 className="font-black text-white text-xl tracking-tighter italic uppercase truncate">
                        {liveMatch.player_2?.name}
                      </h4>
                      <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                        Origin: {(liveMatch.player_2?.id ?? '').substring(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center pt-2 border-t border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-mono text-[9px] text-blue-300 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Swords className="w-3 h-3" /> Establish Connection
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-4xl rounded-3xl p-16 relative overflow-hidden group min-h-[400px] flex items-center justify-center bg-blue-500/5 border border-blue-500/20">
          <div className="absolute inset-0 noise pointer-events-none" />
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: "100%" }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] bg-gradient-to-b from-transparent via-white to-transparent h-[200px]"
          />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-10 text-center">
            <div className="relative">
              <div className="w-20 h-20 border border-white/10 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-zinc-800" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-zinc-400 font-mono text-sm md:text-base uppercase tracking-[0.3em] max-w-md leading-relaxed">
                No active battles currently in the arena. <br />
                <span className="text-zinc-700">Waiting for gladiators to initialize combat…</span>
              </p>
              <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2">
                Awaiting Neural Uplink <span className="block w-2 h-4 bg-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Link
          to="/hub"
          className="px-8 py-4 bg-transparent border border-blue-500/50 text-blue-400 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-blue-500/10 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-3 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />&lt; RETURN TO HUB
        </Link>
      </div>
    </div>
  );
}
