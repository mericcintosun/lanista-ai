import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Megaphone, Users, Flame, Maximize2, Minimize2 } from 'lucide-react';
import { useArenaChat, type ArenaChatMessage } from '../hooks/useArenaChat';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { useAuthStore } from '../lib/auth-store';
import { sendThrowableToUnity } from '../lib/unity';
import { InteractionBar } from './arena/InteractionBar';
import { EmojiReactionBar } from './arena/EmojiReactionBar';
import { EmojiBubble } from './arena/EmojiBubble';
import type { Match } from '@lanista/types';

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
              <p className="font-mono text-[9px] text-amber-400/70 uppercase tracking-[0.25em] leading-none">
                Megaphone
              </p>
              <p className="font-mono text-[10px] text-amber-300/90 font-semibold mt-0.5 truncate max-w-[120px]">
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
  className?: string;
}

function MessageRow({ msg }: { msg: ArenaChatMessage }) {
  // isHighlight removed since it is unused
  const sparkSpent = msg.type === 'highlight' ? 50 : msg.type === 'megaphone' ? 500 : undefined;

  if (msg.type === 'normal') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 rounded-r-lg">
        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 shrink-0">{formatTime(msg.timestamp)}</span>
        <span className="text-xs sm:text-sm font-bold text-zinc-200 shrink-0">{msg.username}:</span>
        <span className="text-xs sm:text-sm leading-relaxed text-zinc-400 break-words min-w-0">{msg.text}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded-r-lg p-2 sm:p-3 border-l-2 border-primary bg-gradient-to-r from-primary/10 to-transparent shadow-[inset_4px_0_0_0_rgba(223,127,62,0.15)]">
      <span className="text-xs sm:text-sm font-bold text-zinc-100 shrink-0">{msg.username}:</span>
      {sparkSpent != null && (
        <span className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-500 px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase tracking-tighter shrink-0">
          {sparkSpent} Spark
        </span>
      )}
      <span className="text-xs sm:text-sm leading-relaxed text-amber-50/95 font-medium break-words min-w-0">{msg.text}</span>
    </div>
  );
}

export function ArenaChat({ matchId, match, unityIframeRef, className = '' }: ArenaChatProps) {
  const session = useAuthStore((s) => s.session);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bannerMegaphone, setBannerMegaphone] = useState<ArenaChatMessage | null>(null);

  const onThrowable = useCallback(
    (payload: { type: 'throwable'; item: 'tomato'; target: 'player_1' | 'player_2' }) => {
      if (unityIframeRef?.current) sendThrowableToUnity(unityIframeRef.current, payload);
    },
    [unityIframeRef]
  );

  const { balance: sparkBalance, loading: sparkLoading, setBalance: setSparkBalance } = useSparkBalance();

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
    error,
  } = useArenaChat(matchId, { 
    onThrowable,
    onSpend: (newBalance) => setSparkBalance(newBalance)
  });

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <InteractionBar
          onThrowTomato={throwTomato}
          onEmoji={sendEmoji}
          sending={sending === 'tomato'}
          session={session}
          player1Name={match?.player_1?.name ?? 'Red'}
          player2Name={match?.player_2?.name ?? 'Blue'}
          className="flex-1"
        />
      </div>

      <AnimatePresence>
        {floatingEmojis.map((e) => (
          <EmojiBubble
            key={e.id}
            id={e.id}
            emoji={e.emoji}
            offsetX={e.offsetX}
            origin={e.origin}
            onComplete={() => removeFloatingEmoji(e.id)}
          />
        ))}
      </AnimatePresence>

      <main
        className={`w-full min-h-[160px] sm:min-h-[360px] lg:min-h-[560px] max-h-[38vh] sm:max-h-[55vh] lg:max-h-[700px] flex flex-col bg-black/60 backdrop-blur-md border border-blue-500/20 rounded-xl overflow-hidden shadow-2xl transition-[max-height] duration-300 ${expanded ? 'max-lg:!max-h-[85vh]' : ''} ${className}`}
      >
        {/* Header */}
        <header className="p-2.5 sm:p-4 border-b border-blue-500/20 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-secondary/10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <h1 className="text-sm sm:text-lg font-bold tracking-wider uppercase italic text-zinc-100">
              Lanista <span className="text-secondary drop-shadow-[0_0_5px_rgba(12,165,90,0.4)]">Arena</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-400 font-mono">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Arena Chat</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="lg:hidden p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={expanded ? 'Collapse' : 'Expand'}
              aria-label={expanded ? 'Collapse chat' : 'Expand chat'}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Message list */}
        <section
          ref={scrollRef}
          data-lenis-prevent
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2.5 sm:p-4 space-y-2 sm:space-y-4 min-h-0 custom-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {messages.length === 0 && (
            <p className="text-zinc-500 text-xs sm:text-sm font-mono py-6 sm:py-10 text-center">
              No messages yet. Join the fight.
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

        {error && (
          <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 text-primary text-xs font-mono shrink-0">
            {error}
          </div>
        )}

        {/* Footer: textarea + actions */}
        <footer className="p-2 sm:p-3 lg:p-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="relative mb-2 sm:mb-3 flex items-end gap-2">
            <EmojiReactionBar origin="left" onEmoji={sendEmoji} disabled={!session} className="shrink-0" />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder={session ? `Message (${MAX_MESSAGE_CHARS})` : 'Sign in to chat'}
              disabled={!session}
              maxLength={MAX_MESSAGE_CHARS}
              rows={1}
              className="flex-1 min-w-0 h-[2.25rem] sm:h-[3rem] lg:h-[4.5rem] min-h-[2.25rem] sm:min-h-[3rem] lg:min-h-[4.5rem] max-h-[2.25rem] sm:max-h-[3rem] lg:max-h-[4.5rem] bg-black/40 border border-zinc-700 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 lg:p-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors resize-none overflow-y-auto"
            />
          </div>

          <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSend('normal')}
                disabled={!session || !input.trim()}
                className="p-1.5 sm:p-2 lg:p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 disabled:opacity-50 disabled:pointer-events-none group"
                title="Send (free)"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
              </button>
              <button
                type="button"
                onClick={() => handleSend('highlight')}
                disabled={!session || !input.trim() || sending !== null}
                className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-amber-500 disabled:opacity-50 disabled:pointer-events-none group"
                title="Highlight (50 Spark)"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter hidden sm:inline">50</span>
              </button>
              <button
                type="button"
                onClick={() => handleSend('megaphone')}
                disabled={!session || !input.trim() || sending !== null}
                className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-primary disabled:opacity-50 disabled:pointer-events-none group"
                title="Megaphone (500 Spark) — banner to all viewers"
              >
                <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter hidden sm:inline">500</span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-zinc-800 border border-zinc-700 rounded-full">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
              <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-tighter">
                {sparkLoading ? '…' : `${sparkBalance.toLocaleString()}`}
              </span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
