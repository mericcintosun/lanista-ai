import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import type { ThrowableTarget } from '../../hooks/useArenaChat';
import { TOMATO_COST } from '../../hooks/useArenaChat';

interface InteractionBarProps {
  onThrowTomato: (target: ThrowableTarget) => void;
  sending: boolean;
  session: { user: { id: string } } | null;
  player1Name?: string;
  player2Name?: string;
  className?: string;
}

export function InteractionBar({
  onThrowTomato,
  sending,
  session,
  player1Name = 'Red',
  player2Name = 'Blue',
  className = '',
}: InteractionBarProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-black/60 backdrop-blur-md border border-blue-500/20 shadow-lg ${className}`}
    >
      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-widest mr-0.5 sm:mr-1">
        Throw
      </span>
      <motion.button
        type="button"
        onClick={() => onThrowTomato('player_1')}
        disabled={!session || sending}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 disabled:opacity-50 disabled:pointer-events-none transition-colors group"
        title={`Throw tomato at ${player1Name} (${TOMATO_COST} Spark)`}
      >
        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tighter">{player1Name}</span>
        <span className="text-[9px] sm:text-[10px] opacity-80 hidden sm:inline">-{TOMATO_COST}</span>
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onThrowTomato('player_2')}
        disabled={!session || sending}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg bg-secondary/10 border border-secondary/30 hover:bg-secondary/20 text-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors group"
        title={`Throw tomato at ${player2Name} (${TOMATO_COST} Spark)`}
      >
        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tighter">{player2Name}</span>
        <span className="text-[9px] sm:text-[10px] opacity-80 hidden sm:inline">-{TOMATO_COST}</span>
      </motion.button>
    </div>
  );
}
