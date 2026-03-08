import { motion } from 'framer-motion';
import type { Match } from '@lanista/types';

interface FightersSectionProps {
  match: Match;
}

export function FightersSection({ match }: FightersSectionProps) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-11 gap-4 items-center max-w-7xl">
      {/* Agent A */}
      <div className="lg:col-span-5 flex flex-col gap-6 text-right">
        <div className="flex items-center gap-6 justify-end">
          <div className="space-y-1">
            <h2 className="font-black text-white text-3xl italic tracking-tighter uppercase">{match.player_1?.name}</h2>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest font-bold">Connected</p>
            </div>
          </div>
          <img
            src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`}
            className="w-24 h-24 bg-zinc-900 border border-white/10 p-1.5 object-cover grayscale brightness-125"
            alt={match.player_1?.name}
          />
        </div>

        {/* HP BAR (LEFT/CYAN) */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            <span className="font-bold text-white">{match.player_1?.current_hp ?? 0} / {match.player_1?.hp ?? 100}</span>
            <span className="font-bold">HP</span>
          </div>
          <div className="w-full h-5 bg-white/5 border border-white/5 relative overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${((match.player_1?.current_hp ?? 0) / (match.player_1?.hp ?? 100)) * 100}%` }}
              className="h-full bg-cyan-400 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ width: '200%' }} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* VS DECORATOR */}
      <div className="lg:col-span-1 flex items-center justify-center py-8">
        <div className="relative">
          <div className="text-[#E84142] font-black italic text-6xl opacity-30 tracking-tighter select-none">VS</div>
          {match.status === 'finished' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-white text-black font-black text-[10px] uppercase px-3 py-1 -rotate-12 whitespace-nowrap border-2 border-black">SEALED</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Agent B */}
      <div className="lg:col-span-5 flex flex-col gap-6 text-left">
        <div className="flex items-center gap-6 justify-start">
          <img
            src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`}
            className="w-24 h-24 bg-zinc-900 border border-white/10 p-1.5 object-cover grayscale brightness-125"
            alt={match.player_2?.name}
          />
          <div className="space-y-1">
            <h2 className="font-black text-white text-3xl italic tracking-tighter uppercase">{match.player_2?.name}</h2>
            <div className="flex items-center gap-2 justify-start">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(223,127,62,0.6)]" />
              <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest font-bold">Connected</p>
            </div>
          </div>
        </div>

        {/* HP BAR (RIGHT/RED) */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            <span className="font-bold">HP</span>
            <span className="font-bold text-white">{match.player_2?.current_hp ?? 0} / {match.player_2?.hp ?? 100}</span>
          </div>
          <div className="w-full h-5 bg-white/5 border border-white/5 relative overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${((match.player_2?.current_hp ?? 0) / (match.player_2?.hp ?? 100)) * 100}%` }}
              className="h-full bg-[#E84142] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ width: '200%' }} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
