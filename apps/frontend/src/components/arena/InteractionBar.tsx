import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Target, Clock } from 'lucide-react';
import type { ThrowableTarget, EmojiOrigin } from '../../hooks/useArenaChat';
import { TOMATO_COST } from '../../hooks/useArenaChat';
import {
  EMOJI_CATEGORIES,
  getRecentEmojis,
  pushRecentEmoji,
  type ArenaEmoji,
  type EmojiCategoryId,
} from '../../lib/arenaEmojis';

type MainTab = 'tomato' | 'emoji';
type EmojiTab = 'recent' | EmojiCategoryId;

interface InteractionBarProps {
  onThrowTomato: (target: ThrowableTarget) => void;
  onEmoji: (emoji: string, origin: EmojiOrigin) => void;
  sending: boolean;
  session: { user: { id: string } } | null;
  player1Name?: string;
  player2Name?: string;
  className?: string;
}

const POPUP_WIDTH = 300;

export function InteractionBar({
  onThrowTomato,
  onEmoji,
  sending,
  session,
  player1Name = 'Red',
  player2Name = 'Blue',
  className = '',
}: InteractionBarProps) {
  const [open, setOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('tomato');
  const [emojiTab, setEmojiTab] = useState<EmojiTab>('recent');
  const [emojiTarget, setEmojiTarget] = useState<ThrowableTarget | null>(null);
  const [position, setPosition] = useState({ bottom: 0, left: 0 });
  const [recent, setRecent] = useState<ArenaEmoji[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const categoryTabsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const padding = 8;
    let left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
    left = Math.max(padding, Math.min(left, window.innerWidth - POPUP_WIDTH - padding));
    setPosition({ bottom: window.innerHeight - rect.top + 6, left });
  }, [open]);

  useEffect(() => {
    if (open) {
      const r = getRecentEmojis();
      setRecent(r);
      setEmojiTab(r.length > 0 ? 'recent' : EMOJI_CATEGORIES[0].id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popupRef.current && !popupRef.current.contains(t) &&
        buttonRef.current && !buttonRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleThrow = (target: ThrowableTarget) => {
    onThrowTomato(target);
    setOpen(false);
  };

  const handleEmojiPick = (emoji: ArenaEmoji) => {
    pushRecentEmoji(emoji);
    setRecent(getRecentEmojis());
    const origin = emojiTarget === 'player_1' ? 'left' : emojiTarget === 'player_2' ? 'right' : (Math.random() < 0.5 ? 'left' : 'right');
    onEmoji(emoji, origin);
    setOpen(false);
    setEmojiTarget(null);
  };

  const handleMainTabChange = (next: MainTab) => {
    setMainTab(next);
    setEmojiTarget(null);
  };

  const activeEmojis: ArenaEmoji[] =
    emojiTab === 'recent'
      ? recent
      : (() => {
          const category = EMOJI_CATEGORIES.find((c) => c.id === emojiTab);
          return category ? [...category.emojis] : [];
        })();

  const playerButtons = (
    <div className="flex gap-2 mb-3">
      <button
        type="button"
        onClick={() =>
          mainTab === 'tomato' ? handleThrow('player_1') : setEmojiTarget('player_1')
        }
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-tight truncate transition-colors ${
          mainTab === 'emoji' && emojiTarget === 'player_1'
            ? 'bg-blue-500/25 border-blue-400 text-blue-300'
            : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400'
        }`}
      >
        <Target className="w-3 h-3 shrink-0" />
        <span className="truncate">{player1Name}</span>
      </button>
      <button
        type="button"
        onClick={() =>
          mainTab === 'tomato' ? handleThrow('player_2') : setEmojiTarget('player_2')
        }
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-tight truncate transition-colors ${
          mainTab === 'emoji' && emojiTarget === 'player_2'
            ? 'bg-secondary/25 border-secondary/80 text-secondary'
            : 'bg-secondary/10 border-secondary/30 hover:bg-secondary/20 text-secondary'
        }`}
      >
        <Target className="w-3 h-3 shrink-0" />
        <span className="truncate">{player2Name}</span>
      </button>
    </div>
  );

  const portalTarget = (document.fullscreenElement as Element | null) ?? document.body;

  const popup = open && (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        style={{ bottom: position.bottom, left: position.left, width: POPUP_WIDTH }}
        className="fixed p-3 rounded-xl bg-zinc-900/98 border border-zinc-700/80 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl z-[300]"
      >
        {/* Main tab bar: Tomato | Emoji */}
        <div className="flex gap-1 mb-3 p-0.5 bg-zinc-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => handleMainTabChange('tomato')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
              mainTab === 'tomato' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm leading-none">🍅</span>
            <span>Tomato</span>
            <span className="text-amber-400 font-mono text-[10px]">-{TOMATO_COST}</span>
          </button>
          <button
            type="button"
            onClick={() => handleMainTabChange('emoji')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
              mainTab === 'emoji' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm leading-none">😊</span>
            <span>Emoji</span>
          </button>
        </div>

        {/* Tomato tab: requires session + target selection */}
        {mainTab === 'tomato' && (
          !session ? (
            <p className="text-[11px] font-mono text-zinc-500 text-center mb-3 py-1">
              Sign in to throw tomatoes
            </p>
          ) : (
            playerButtons
          )
        )}

        {/* Emoji tab: target is optional (sets which side the emoji floats from) */}
        {mainTab === 'emoji' && (
          <div>
            {/* Optional side preference */}
            <p className="text-[11px] font-mono text-zinc-500 mb-1.5">
              Side <span className="text-zinc-600">(optional)</span>
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setEmojiTarget(emojiTarget === 'player_1' ? null : 'player_1')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-tight truncate transition-colors ${
                  emojiTarget === 'player_1'
                    ? 'bg-blue-500/25 border-blue-400 text-blue-300'
                    : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400'
                }`}
              >
                <span className="truncate">← {player1Name}</span>
              </button>
              <button
                type="button"
                onClick={() => setEmojiTarget(emojiTarget === 'player_2' ? null : 'player_2')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-tight truncate transition-colors ${
                  emojiTarget === 'player_2'
                    ? 'bg-secondary/25 border-secondary/80 text-secondary'
                    : 'bg-secondary/10 border-secondary/30 hover:bg-secondary/20 text-secondary'
                }`}
              >
                <span className="truncate">{player2Name} →</span>
              </button>
            </div>

            {/* Category tab bar — horizontal scroll */}
            <div
              ref={categoryTabsRef}
              className="flex gap-0.5 mb-2 overflow-x-auto no-scrollbar"
            >
              {recent.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEmojiTab('recent')}
                  className={`shrink-0 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                    emojiTab === 'recent'
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title="Recent"
                >
                  <Clock className="w-3 h-3" />
                </button>
              )}
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setEmojiTab(cat.id as EmojiCategoryId)}
                  title={cat.label}
                  className={`shrink-0 px-2 py-1 rounded-md text-base leading-none transition-colors ${
                    emojiTab === cat.id
                      ? 'bg-zinc-700'
                      : 'opacity-60 hover:opacity-100 hover:bg-zinc-800'
                  }`}
                >
                  {cat.icon}
                </button>
              ))}
            </div>

            {/* Emoji grid — always clickable */}
            <div className="flex flex-wrap gap-0.5 h-[156px] overflow-y-auto custom-scrollbar">
              {activeEmojis.length === 0 ? (
                <p className="text-[11px] font-mono text-zinc-600 w-full text-center pt-4">
                  No emojis yet
                </p>
              ) : (
                activeEmojis.map((e, idx) => (
                  <button
                    key={`${emojiTab}-${idx}-${e}`}
                    type="button"
                    onClick={() => handleEmojiPick(e)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-700/80 text-lg transition-colors"
                  >
                    {e}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={sending}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        title="Reactions"
        aria-label="Reactions"
      >
        <Smile className="w-4 h-4" />
      </motion.button>

      {popup && createPortal(popup, portalTarget)}
    </div>
  );
}
