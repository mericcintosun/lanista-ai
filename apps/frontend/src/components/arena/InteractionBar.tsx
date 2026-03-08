import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target } from 'lucide-react';
import type { ThrowableTarget } from '../../hooks/useArenaChat';
import { TOMATO_COST } from '../../hooks/useArenaChat';
import { EmojiReactionBar } from './EmojiReactionBar';

interface InteractionBarProps {
  onThrowTomato: (target: ThrowableTarget) => void;
  onEmoji: (emoji: string, origin: 'left' | 'right') => void;
  sending: boolean;
  session: { user: { id: string } } | null;
  player1Name?: string;
  player2Name?: string;
  className?: string;
}

export function InteractionBar({
  onThrowTomato,
  onEmoji,
  sending,
  session,
  player1Name = 'Red',
  player2Name = 'Blue',
  className = '',
}: InteractionBarProps) {
  const [throwOpen, setThrowOpen] = useState(false);
  const throwButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!throwOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current && !popupRef.current.contains(target) &&
        throwButtonRef.current && !throwButtonRef.current.contains(target)
      ) {
        setThrowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [throwOpen]);

  const handleThrow = (target: ThrowableTarget) => {
    onThrowTomato(target);
    setThrowOpen(false);
  };

  return (
    <div
      className={`flex items-center justify-center gap-3 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-black border border-white/5 ${className}`}
    >
      <EmojiReactionBar origin="left" onEmoji={onEmoji} disabled={!session} className="shrink-0" />

      <div className="relative shrink-0">
        <motion.button
          ref={throwButtonRef}
          type="button"
          onClick={() => setThrowOpen((o) => !o)}
          disabled={!session || sending}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          title={`Throw tomato (-${TOMATO_COST} Spark)`}
          aria-label="Throw tomato"
        >
          <span className="text-base leading-none select-none">🍅</span>
        </motion.button>

        <AnimatePresence>
          {throwOpen && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-xl bg-zinc-900/98 border border-zinc-700/80 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 w-[200px]"
            >
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2.5 text-center">
                Target — {TOMATO_COST} Spark
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleThrow('player_1')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 transition-colors"
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-tight truncate">{player1Name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThrow('player_2')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/10 border border-secondary/30 hover:bg-secondary/20 text-secondary transition-colors"
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-tight truncate">{player2Name}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
