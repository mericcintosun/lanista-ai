import { useEffect, useMemo, useState } from 'react';
import type { Match } from '@lanista/types';
import { Clock } from 'lucide-react';

interface LobbyCountdownProps {
  match: Match;
  logsCount: number;
}

const LOBBY_DURATION_SECONDS = 45;

export function LobbyCountdown({ match, logsCount }: LobbyCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { remainingSeconds, isActive } = useMemo(() => {
    // Prefer authoritative lobby_ends_at to fix client-server clock skew drift
    let endMs: number | null = null;
    if (match.lobby_ends_at) {
      endMs = new Date(match.lobby_ends_at).getTime();
    } else if (match.created_at) {
      endMs = new Date(match.created_at).getTime() + LOBBY_DURATION_SECONDS * 1000;
    }

    if (!endMs) return { remainingSeconds: 0, isActive: false };

    const remaining = Math.max(0, Math.floor((endMs - nowMs) / 1000));
    const isFinished = match.status === 'finished' || match.status === 'aborted';
    const hasCombatStarted = logsCount > 0 || isFinished;

    return {
      remainingSeconds: remaining,
      isActive: !hasCombatStarted && remaining > 0,
    };
  }, [match.lobby_ends_at, match.created_at, match.status, logsCount, nowMs]);

  if (!isActive) return null;

  const total = remainingSeconds;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="rounded-xl border border-blue-500/40 bg-blue-950/60 px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(59,130,246,0.35)]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/40">
          <Clock className="w-4 h-4 text-blue-200" />
        </div>
        <div className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blue-300/80">
            Lobby Phase // Social Predictions
          </p>
          <p className="text-sm sm:text-base text-blue-50">
            Combat is arming up. Use the lobby window to pick your champion, drop hype, and get the arena ready.
          </p>
        </div>
      </div>
      <div className="sm:text-right flex items-center sm:items-end gap-2 sm:flex-col">
        <span className="font-mono text-[10px] text-blue-300/80 uppercase tracking-[0.25em]">Starts In</span>
        <span className="font-mono text-xl sm:text-2xl font-black text-blue-100 tabular-nums">{formatted}</span>
      </div>
    </div>
  );
}
