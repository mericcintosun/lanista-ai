import { useEffect, useMemo, useState } from 'react';
import type { Match } from '@lanista/types';
import { Clock, Zap } from 'lucide-react';

const SKY  = { b: '#5bb3f5', dim: 'rgba(91,179,245,0.18)',  ring: 'rgba(91,179,245,0.4)'  };
const FIRE = { b: '#f0894e', dim: 'rgba(240,137,78,0.18)', ring: 'rgba(240,137,78,0.4)' };

const LOBBY_SECONDS = 45;

interface LobbyCountdownProps { match: Match; logsCount: number }

export function LobbyCountdown({ match, logsCount }: LobbyCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { remaining, isLobby } = useMemo(() => {
    let endMs: number | null = null;
    if (match.lobby_ends_at) endMs = new Date(match.lobby_ends_at).getTime();
    else if (match.created_at) endMs = new Date(match.created_at).getTime() + LOBBY_SECONDS * 1000;
    if (!endMs) return { remaining: 0, isLobby: false };
    const r = Math.max(0, Math.floor((endMs - nowMs) / 1000));
    const done = logsCount > 0 || match.status === 'active' || match.status === 'finished' || match.status === 'aborted';
    return { remaining: r, isLobby: !done };
  }, [match, logsCount, nowMs]);

  if (!isLobby) return null;

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');
  const starting = remaining <= 0;
  const c = starting ? FIRE : SKY;

  return (
    <div className="rounded-xl flex items-center gap-4 px-5 py-4 transition-all duration-500"
      style={{ background: c.dim, border: `1px solid ${c.ring}` }}>

      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${c.ring}` }}>
        {starting
          ? <Zap className="w-5 h-5 animate-pulse" style={{ color: c.b }} />
          : <Clock className="w-5 h-5" style={{ color: c.b }} />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: c.b }}>
          {starting ? '⚡ Initializing Arena' : '// Lobby Phase'}
        </p>
        <p className="text-sm text-white/55 leading-snug truncate">
          {starting
            ? 'Locking predictions — combat link establishing…'
            : 'Place your Sparks on your champion before combat begins.'}
        </p>
      </div>

      {/* Timer */}
      <div className="shrink-0 text-right">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: c.b, opacity: 0.7 }}>
          {starting ? 'Starting' : 'Starts in'}
        </p>
        <p className="font-mono text-3xl font-black tabular-nums leading-none"
          style={{ color: c.b, opacity: starting ? 0.4 : 1 }}>
          {mm}:{ss}
        </p>
      </div>
    </div>
  );
}
