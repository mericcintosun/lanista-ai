import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Swords, Gamepad2 } from 'lucide-react';
import type { Match } from '@lanista/types';

interface LiveEngagementsProps {
  liveMatches: Match[];
}

export function LiveEngagements({ liveMatches }: LiveEngagementsProps) {
  return (
    <div className="lg:col-span-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass rounded-2xl p-8 relative overflow-hidden group h-full"
      >
        <div className="absolute inset-0 noise pointer-events-none" />
        <h3 className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(255,45,45,1)]" />
          Live Engagements
        </h3>

        <div className="space-y-4">
          {liveMatches.length > 0 ? (
            liveMatches.map((match) => (
              <Link key={match.id} to={`/game-arena/${match.id}`} className="block group/item">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center justify-between p-6 bg-black/40 border border-white/5 group-hover/item:border-[#E84142]/30 transition-all relative overflow-hidden text-white"
                >
                  <div className="absolute left-0 top-0 w-1 h-full bg-[#E84142] opacity-20" />

                  <div className="flex items-center gap-12 w-full justify-center py-2">
                    <div className="flex items-center gap-5 text-right flex-1 justify-end">
                      <div>
                        <h4 className="font-black text-white text-xl tracking-tighter italic uppercase">{match.player_1?.name}</h4>
                        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-0.5">Origin: Protocol</p>
                      </div>
                      <img
                        src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                        alt=""
                        className="w-14 h-14 rounded-full bg-zinc-900 ring-1 ring-white/10 p-0.5"
                      />
                    </div>

                    <div className="text-[#E84142] font-black italic text-xl px-4 opacity-40 tracking-tighter">VS</div>

                    <div className="flex items-center gap-5 flex-1 text-left">
                      <img
                        src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                        alt=""
                        className="w-14 h-14 rounded-full bg-zinc-900 ring-1 ring-white/10 p-0.5"
                      />
                      <div>
                        <h4 className="font-black text-white text-xl tracking-tighter italic uppercase">{match.player_2?.name}</h4>
                        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-0.5">Origin: Protocol</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-4 flex items-center gap-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <Link
                      to={`/game-arena/${match.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-[0.1em] hover:text-cyan-300 transition-colors"
                    >
                      <Gamepad2 className="w-3.5 h-3.5" /> Watch in Game
                    </Link>
                    <span className="text-zinc-700">|</span>
                    <span className="flex items-center gap-1.5 text-xs font-mono text-[#E84142] uppercase tracking-[0.1em]">
                      <Swords className="w-3.5 h-3.5" /> Broadcast Live
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/20 rounded-lg bg-white/5 h-full">
              <div className="font-mono text-xs text-zinc-200 uppercase tracking-[0.2em] text-center">
                <span className="block font-bold">Offline</span>
                <span className="block text-zinc-500 mt-2 italic">Waiting for combat broadcast...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
