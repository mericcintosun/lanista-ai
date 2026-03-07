import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import { ARENA_EMOJIS, getRecentEmojis, pushRecentEmoji, type ArenaEmoji } from '../../lib/arenaEmojis';
import type { EmojiOrigin } from '../../hooks/useArenaChat';

interface EmojiReactionBarProps {
  onEmoji: (emoji: string, origin: EmojiOrigin) => void;
  origin: EmojiOrigin;
  disabled?: boolean;
  className?: string;
}

export function EmojiReactionBar({ onEmoji, origin, disabled = false, className = '' }: EmojiReactionBarProps) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<ArenaEmoji[]>(() => getRecentEmojis());
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setRecent(getRecentEmojis());
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const size = 240;
    const padding = 8;
    const top = rect.bottom + padding;
    const left = rect.left;
    const maxTop = window.innerHeight - size - padding;
    setPosition({
      top: Math.min(top, maxTop),
      left: Math.max(padding, Math.min(left, window.innerWidth - size - padding)),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handlePick = (emoji: ArenaEmoji) => {
    pushRecentEmoji(emoji);
    setRecent(getRecentEmojis());
    onEmoji(emoji, origin);
    setOpen(false);
  };

  const popoverContent = open && (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15 }}
        className="fixed p-2 rounded-xl bg-zinc-900/98 border border-zinc-700 shadow-xl backdrop-blur-xl z-[200] w-[240px] h-[240px] flex flex-col"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
            {recent.length > 0 && (
              <div className="mb-1.5 pb-1.5 border-b border-zinc-700/50 shrink-0">
                <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Son</p>
                <div className="flex flex-wrap gap-0.5">
                  {recent.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handlePick(e)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-700/80 text-lg transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1 shrink-0">Emojiler</p>
            <div className="flex flex-wrap gap-0.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {ARENA_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handlePick(e)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-700/80 text-lg transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        title="Emoji bırak"
        aria-label="Emoji bırak"
      >
        <Smile className="w-4 h-4" />
      </button>

      {popoverContent && createPortal(popoverContent, document.body)}
    </div>
  );
}
