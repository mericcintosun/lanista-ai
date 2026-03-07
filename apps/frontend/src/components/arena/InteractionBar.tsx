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
      className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-black/60 backdrop-blur-md border border-zinc-800 shadow-lg ${className}`}
    >
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mr-1">
        Throw
      </span>
      <motion.button
        type="button"
        onClick={() => onThrowTomato('player_1')}
        disabled={!session || sending}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors group"
        title={`Throw tomato at ${player1Name} (${TOMATO_COST} Spark)`}
      >
        <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-tighter">{player1Name}</span>
        <span className="text-[10px] opacity-80">-{TOMATO_COST}</span>
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onThrowTomato('player_2')}
        disabled={!session || sending}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors group"
        title={`Throw tomato at ${player2Name} (${TOMATO_COST} Spark)`}
      >
        <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-tighter">{player2Name}</span>
        <span className="text-[10px] opacity-80">-{TOMATO_COST}</span>
      </motion.button>
    </div>
  );
}
