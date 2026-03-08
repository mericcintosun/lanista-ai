import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Megaphone, Flame, RefreshCw, Minimize2, Target, Smile, UserCircle } from 'lucide-react';
// HpBar component kept for potential future use
import { motion, AnimatePresence } from 'framer-motion';
import type { Match } from '@lanista/types';
import { TOMATO_COST } from '../../hooks/useArenaChat';
import { useSparkBalance } from '../../hooks/useSparkBalance';
import { useAuthStore } from '../../lib/auth-store';
import { useUIStore } from '../../lib/ui-store';
import type { ArenaChatState } from '../ArenaChat';

const MAX_MESSAGE_CHARS = 280;
const QUICK_EMOJIS = ['🔥', '💥', '👏', '😱', '⚡', '💪', '🎯', '🤯', '👾', '🏆', '💀', '🤖'];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function HpBar({ pct, color }: { pct: number; color: 'blue' | 'green' | 'reverse-blue' | 'reverse-green' }) {
  const isReverse = color.startsWith('reverse');
  const baseColor = color.includes('blue') ? '#3b82f6' : '#0ca55a';
  const warnColor = '#f59e0b';
  const dangerColor = '#ef4444';
  const barColor = pct > 50 ? baseColor : pct > 25 ? warnColor : dangerColor;
  const segments = 20;

  return (
    <div className={`flex gap-[2px] ${isReverse ? 'flex-row-reverse' : ''}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const threshold = isReverse ? ((segments - i) / segments) * 100 : ((i + 1) / segments) * 100;
        const active = isReverse ? (100 - pct) < threshold : threshold <= pct;
        return (
          <div
            key={i}
            className="flex-1 h-2.5 rounded-[2px] transition-all duration-700"
            style={{
              background: active ? barColor : 'rgba(255,255,255,0.08)',
              boxShadow: active && pct > 0 ? `0 0 4px ${barColor}80` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

interface FullscreenHUDProps {
  match: Match;
  onRefresh: () => void;
  onExitFullscreen: () => void;
  chatState: ArenaChatState;
}

export function FullscreenHUD({ match, onRefresh, onExitFullscreen, chatState }: FullscreenHUDProps) {
  const session = useAuthStore((s) => s.session);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const [input, setInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [throwOpen, setThrowOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { balance: sparkBalance, loading: sparkLoading } = useSparkBalance();

  const {
    messages,
    sendNormalMessage,
    sendHighlightMessage,
    sendMegaphoneMessage,
    throwTomato,
    sendEmoji,
    sending,
    error,
  } = chatState;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (type: 'normal' | 'highlight' | 'megaphone') => {
    const text = input.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) return;
    if (type === 'normal') sendNormalMessage(text);
    else if (type === 'highlight') sendHighlightMessage(text);
    else sendMegaphoneMessage(text);
    setInput('');
  };

  const p1 = match.player_1;
  const p2 = match.player_2;
  const p1MaxHp = p1?.hp || 100;
  const p2MaxHp = p2?.hp || 100;
  const p1Hp = Math.max(0, p1?.current_hp ?? 0);
  const p2Hp = Math.max(0, p2?.current_hp ?? 0);
  const p1Pct = Math.min(100, (p1Hp / p1MaxHp) * 100);
  const p2Pct = Math.min(100, (p2Hp / p2MaxHp) * 100);
  const isFinished = match.status === 'finished' || match.status === 'aborted';
  const isLive = match.status === 'active';

  const visibleMessages = messages.slice(-5);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">

      {/* ══ BOTTOM OVERLAY ═══════════════════════════════════════════════ */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 55%, transparent 100%)' }}
      >
        {/* Chat messages — fade in from top */}
        <div
          ref={scrollRef}
          className="px-5 pt-8 pb-2 space-y-1 max-h-[120px] overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          <AnimatePresence initial={false}>
            {visibleMessages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1 - (visibleMessages.length - 1 - idx) * 0.18, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-xs leading-relaxed ${
                  msg.type !== 'normal' ? 'text-amber-100/90' : 'text-zinc-300'
                }`}
              >
                <span className="font-mono text-[10px] text-zinc-600 mr-1.5">{formatTime(msg.timestamp)}</span>
                {msg.type !== 'normal' && (
                  <span className="font-mono text-[9px] text-primary uppercase tracking-widest mr-1.5 bg-primary/10 px-1 py-0.5 rounded">
                    {msg.type}
                  </span>
                )}
                <span className="font-bold text-zinc-200">{msg.username}</span>
                <span className="text-zinc-500 mx-1">·</span>
                <span>{msg.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 px-5 pb-5 pt-2">

          {/* Emoji picker */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setEmojiOpen((o) => !o); setThrowOpen(false); }}
              disabled={!session}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/8 hover:bg-white/14 text-zinc-400 hover:text-zinc-100 text-xs font-bold disabled:opacity-40 transition-colors"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emoji</span>
            </button>
            {emojiOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-zinc-950/98 rounded-xl p-3 shadow-2xl backdrop-blur-xl z-30 w-[228px]">
                <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Quick reactions</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { sendEmoji(e, 'left'); setEmojiOpen(false); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-xl transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Throw tomato */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setThrowOpen((o) => !o); setEmojiOpen(false); }}
              disabled={!session || sending === 'tomato'}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/8 hover:bg-white/14 text-zinc-400 hover:text-zinc-100 text-xs font-bold disabled:opacity-40 transition-colors"
            >
              <span className="text-base leading-none">🍅</span>
              <span>Throw</span>
              <span className="font-mono text-zinc-600">-{TOMATO_COST}</span>
            </button>
            {throwOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-zinc-950/98 rounded-xl p-3 shadow-2xl backdrop-blur-xl z-30 w-[200px]">
                <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-2.5 text-center">
                  Target — {TOMATO_COST} Spark
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { throwTomato('player_1'); setThrowOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-colors"
                  >
                    <Target className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p1?.name?.slice(0, 7) || 'P1'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { throwTomato('player_2'); setThrowOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-bold transition-colors"
                  >
                    <Target className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p2?.name?.slice(0, 7) || 'P2'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick emoji singles */}
          {(['🔥', '💥', '👏'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => sendEmoji(e, 'left')}
              disabled={!session}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/14 text-xl disabled:opacity-40 transition-colors shrink-0"
            >
              {e}
            </button>
          ))}

          {/* Match status */}
          {isLive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="font-mono text-[10px] text-red-400 uppercase tracking-widest font-black">Live</span>
            </div>
          )}
          {isFinished && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/60 shrink-0">
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-black">Archived</span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Spark balance */}
          {session && (
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-500/8 shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-mono text-xs text-amber-400 tabular-nums font-black">
                {sparkLoading ? '…' : sparkBalance.toLocaleString()}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/14 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Reload"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onExitFullscreen}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/14 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Message input + send */}
          {!session ? (
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-bold transition-colors shrink-0"
            >
              <UserCircle className="w-3.5 h-3.5" />
              Sign in to chat
            </button>
          ) : (
            <div className="flex items-stretch gap-1.5 shrink-0">
              {error && (
                <span className="self-center text-[10px] text-primary font-mono max-w-[120px] truncate">{error}</span>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend('normal'); } }}
                placeholder="Send message..."
                maxLength={MAX_MESSAGE_CHARS}
                className="w-48 h-9 bg-white border border-zinc-300/20 rounded-lg px-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSend('highlight')}
                disabled={!input.trim() || sending !== null}
                title="Highlight (50 Spark)"
                className="flex items-center justify-center gap-1 h-9 px-2.5 rounded-lg bg-amber-500/12 hover:bg-amber-500/22 text-amber-500 text-[10px] font-black disabled:opacity-40 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>50</span>
              </button>
              <button
                type="button"
                onClick={() => handleSend('megaphone')}
                disabled={!input.trim() || sending !== null}
                title="Megaphone (500 Spark)"
                className="flex items-center justify-center gap-1 h-9 px-2.5 rounded-lg bg-primary/12 hover:bg-primary/22 text-primary text-[10px] font-black disabled:opacity-40 transition-colors"
              >
                <Megaphone className="w-3 h-3" />
                <span>500</span>
              </button>
              <button
                type="button"
                onClick={() => handleSend('normal')}
                disabled={!input.trim() || sending !== null}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary hover:bg-primary/80 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
