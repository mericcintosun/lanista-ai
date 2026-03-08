import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Megaphone, Flame, Maximize2, Minimize2, UserCircle } from 'lucide-react';
import { useUIStore } from '../lib/ui-store';
import { useArenaChat, type ArenaChatMessage, type EmojiOrigin, type ThrowableTarget } from '../hooks/useArenaChat';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { useAuthStore } from '../lib/auth-store';
import { sendThrowableToUnity } from '../lib/unity';
import { InteractionBar } from './arena/InteractionBar';
import { EmojiBubble } from './arena/EmojiBubble';
import type { Match } from '@lanista/types';

export interface ArenaChatState {
  messages: ArenaChatMessage[];
  floatingEmojis: { id: string; emoji: string; offsetX: number; origin?: EmojiOrigin }[];
  removeFloatingEmoji: (id: string) => void;
  sendEmoji: (emoji: string, origin: EmojiOrigin) => void;
  sendNormalMessage: (text: string) => void;
  sendHighlightMessage: (text: string) => void;
  sendMegaphoneMessage: (text: string) => void;
  throwTomato: (target: ThrowableTarget) => void;
  sending: string | null;
}

const MEGAPHONE_BANNER_DURATION_MS = 8000;
const MAX_MESSAGE_CHARS = 280;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MegaphoneBanner({ message }: { message: ArenaChatMessage }) {
  const displayText = `${message.username}: ${message.text}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 right-0 z-[90] pointer-events-none overflow-hidden"
      style={{ top: '5rem' }}
    >
      <div className="relative mx-4 rounded-lg border border-amber-500/40 bg-gradient-to-b from-zinc-900/98 to-zinc-950/98 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/5 via-transparent to-primary/5 pointer-events-none" aria-hidden />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b from-amber-500 via-amber-400 to-primary" aria-hidden />
        <div className="flex items-center h-14">
          <div className="flex items-center gap-3 pl-4 pr-6 shrink-0 border-r border-amber-500/20">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30">
              <Megaphone className="w-5 h-5 text-amber-400" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-mono text-[11px] text-amber-400/70 uppercase tracking-[0.25em] leading-none">
                Megaphone
              </p>
              <p className="font-mono text-xs text-amber-300/90 font-semibold mt-0.5 truncate max-w-[120px]">
                {message.username}
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden py-2">
            <motion.div
              className="flex whitespace-nowrap"
              initial={{ x: '100%' }}
              animate={{ x: '-100%' }}
              transition={{ duration: 7, ease: 'linear' }}
            >
              <span className="inline-block pl-4 text-base sm:text-lg font-semibold text-white tracking-tight">
                {displayText}
              </span>
            </motion.div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-zinc-900 to-transparent shrink-0 pointer-events-none" aria-hidden />
        </div>
      </div>
    </motion.div>
  );
}

interface ArenaChatProps {
  matchId: string | null;
  match?: Match | null;
  unityIframeRef?: React.RefObject<HTMLIFrameElement | null>;
  gameEmojiContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  chatState?: ArenaChatState;
}

function MessageRow({ msg }: { msg: ArenaChatMessage }) {
  // isHighlight removed since it is unused
  const sparkSpent = msg.type === 'highlight' ? 50 : msg.type === 'megaphone' ? 500 : undefined;

  if (msg.type === 'normal') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 rounded-r-lg">
        <span className="text-[11px] font-mono text-zinc-500 shrink-0">{formatTime(msg.timestamp)}</span>
        <span className="text-xs sm:text-sm font-bold text-zinc-200 shrink-0">{msg.username}:</span>
        <span className="text-xs sm:text-sm leading-relaxed text-zinc-400 break-words min-w-0">{msg.text}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded-r-lg p-2 sm:p-3 border-l-2 border-primary bg-gradient-to-r from-primary/10 to-transparent shadow-[inset_4px_0_0_0_rgba(223,127,62,0.15)]">
      <span className="text-xs sm:text-sm font-bold text-zinc-100 shrink-0">{msg.username}:</span>
      {sparkSpent != null && (
        <span className="text-[11px] bg-amber-500/10 text-amber-500 px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase tracking-tighter shrink-0">
          {sparkSpent} Spark
        </span>
      )}
      <span className="text-xs sm:text-sm leading-relaxed text-amber-50/95 font-medium break-words min-w-0">{msg.text}</span>
    </div>
  );
}

export function ArenaChat({ matchId, match, unityIframeRef, gameEmojiContainerRef, className = '', chatState }: ArenaChatProps) {
  const session = useAuthStore((s) => s.session);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bannerMegaphone, setBannerMegaphone] = useState<ArenaChatMessage | null>(null);

  const onThrowable = useCallback(
    (payload: { type: 'throwable'; item: 'tomato'; target: 'player_1' | 'player_2' }) => {
      if (unityIframeRef?.current) sendThrowableToUnity(unityIframeRef.current, payload);
    },
    [unityIframeRef]
  );

  const { balance: sparkBalance, loading: sparkLoading, setBalance: setSparkBalance } = useSparkBalance();

  // Use external chatState if provided (avoids dual Supabase subscriptions),
  // otherwise fall back to own hook instance.
  const internalChat = useArenaChat(chatState ? null : matchId, {
    onThrowable,
    onSpend: (newBalance) => setSparkBalance(newBalance),
  });

  const {
    messages,
    floatingEmojis,
    removeFloatingEmoji,
    sendEmoji,
    sendNormalMessage,
    sendHighlightMessage,
    sendMegaphoneMessage,
    throwTomato,
    sending,
  } = chatState ?? internalChat;

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.type !== 'megaphone') return;
    setBannerMegaphone(last);
    const t = setTimeout(() => setBannerMegaphone(null), MEGAPHONE_BANNER_DURATION_MS);
    return () => clearTimeout(t);
  }, [messages]);

  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSend = (type: 'normal' | 'highlight' | 'megaphone') => {
    const text = input.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) return;
    if (type === 'normal') {
      sendNormalMessage(text);
    } else if (type === 'highlight') {
      sendHighlightMessage(text);
    } else {
      sendMegaphoneMessage(text);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend('normal');
    }
  };

  if (!matchId) return null;

  return (
    <>
      <AnimatePresence>
        {bannerMegaphone && (
          <MegaphoneBanner key={bannerMegaphone.id} message={bannerMegaphone} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {floatingEmojis.map((e) => (
          <EmojiBubble
            key={e.id}
            id={e.id}
            emoji={e.emoji}
            offsetX={e.offsetX}
            origin={e.origin}
            onComplete={() => removeFloatingEmoji(e.id)}
            containerRef={gameEmojiContainerRef}
          />
        ))}
      </AnimatePresence>

      <main
        className={`w-full flex flex-col bg-black border border-blue-500/20 rounded-xl overflow-hidden shadow-2xl transition-[max-height] duration-300 ${expanded ? 'max-lg:!max-h-[85vh]' : ''} ${className}`}
      >
        {/* Header — minimal: only expand on mobile, no title text */}
        <header className="p-2 sm:p-3 border-b border-white/5 flex items-center justify-end bg-black shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="lg:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
            aria-label={expanded ? 'Collapse chat' : 'Expand chat'}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </header>

        {/* Message list — fills space like Twitch/Kick */}
        <section
          ref={scrollRef}
          data-lenis-prevent
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2.5 sm:p-4 space-y-2 sm:space-y-4 min-h-0 custom-scrollbar bg-black"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-500 pb-2 sm:pb-3 border-b border-white/5 shrink-0">
            Arena Chat
          </h2>
          {messages.length === 0 && (
            <p className="text-zinc-500 text-xs sm:text-sm font-mono py-6 sm:py-10 text-center">
              No messages yet.
            </p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageRow msg={msg} />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        {/* Footer: show sign-in prompt for unauthenticated users, full input for authenticated */}
        {!session ? (
          <footer className="p-3 sm:p-4 border-t border-white/5 bg-black shrink-0">
            <button
              type="button"
              onClick={openAuthModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary transition-colors"
            >
              <UserCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest">Sign in to participate</span>
            </button>
          </footer>
        ) : (
          <footer className="p-2 sm:p-3 border-t border-white/5 bg-black shrink-0 space-y-2 sm:space-y-3">
            {/* Row 1: input + send button inside */}
            <div className="relative flex w-full h-10">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                onKeyDown={handleKeyDown}
                placeholder="Send message..."
                maxLength={MAX_MESSAGE_CHARS}
                className="w-full min-w-0 bg-white border border-zinc-300 rounded-lg pl-3 pr-20 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-primary transition-colors"
              />
              <span className={`absolute right-10 top-1/2 -translate-y-1/2 text-[11px] font-mono tabular-nums pointer-events-none select-none ${input.length >= MAX_MESSAGE_CHARS ? 'text-red-500' : input.length >= MAX_MESSAGE_CHARS * 0.8 ? 'text-amber-500' : 'text-zinc-400'}`}>
                {MAX_MESSAGE_CHARS - input.length}
              </span>
              <button
                type="button"
                onClick={() => handleSend('normal')}
                disabled={!input.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary hover:bg-primary/90 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Row 2: Spark | Highlight | Megaphone  ·  emoji on far right */}
            <div className="flex items-center gap-1.5 w-full h-9">
              <div className="flex items-center gap-1.5 px-2.5 bg-zinc-800 border border-zinc-700 rounded-lg shrink-0 h-full">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-amber-500 tabular-nums">
                  {sparkLoading ? '…' : sparkBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-stretch gap-1 shrink-0 h-full">
                <button
                  type="button"
                  onClick={() => handleSend('highlight')}
                  disabled={!input.trim() || sending !== null}
                  className="px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  title="Highlight (50 Spark)"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSend('megaphone')}
                  disabled={!input.trim() || sending !== null}
                  className="px-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  title="Megaphone (500 Spark)"
                >
                  <Megaphone className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1" />
              <InteractionBar
                onThrowTomato={throwTomato}
                onEmoji={sendEmoji}
                sending={sending === 'tomato'}
                session={session}
                player1Name={match?.player_1?.name ?? 'Red'}
                player2Name={match?.player_2?.name ?? 'Blue'}
                className="shrink-0 h-full"
              />
            </div>
          </footer>
        )}
      </main>
    </>
  );
}
