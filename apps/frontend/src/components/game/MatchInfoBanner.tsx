import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink } from 'lucide-react';
import type { Match } from '@lanista/types';

interface MatchInfoBannerProps {
  match: Match;
  matchId: string;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MatchInfoBanner({ match, matchId }: MatchInfoBannerProps) {
  const [copied, setCopied] = useState(false);

  const p1 = match.player_1;
  const p2 = match.player_2;
  const p1Id = match.player_1_id ?? p1?.id;
  const p2Id = match.player_2_id ?? p2?.id;
  const isFinished = match.status === 'finished' || match.status === 'aborted';

  const p1Hp = p1?.current_hp ?? 0;
  const p2Hp = p2?.current_hp ?? 0;
  const resolvedWinnerId = (() => {
    if (!isFinished) return match.winner_id;
    if (p1Hp > 0 && p2Hp <= 0) return p1Id;
    if (p2Hp > 0 && p1Hp <= 0) return p2Id;
    return match.winner_id;
  })();

  const winnerIsP1 = !!resolvedWinnerId && resolvedWinnerId === p1Id;
  const winnerIsP2 = !!resolvedWinnerId && resolvedWinnerId === p2Id;

  const statusLabel =
    match.status === 'active' ? 'Live' :
    match.status === 'pending' ? 'Preparing' :
    match.status === 'finished' ? 'Archived' : 'Aborted';

  const statusClass =
    match.status === 'active'
      ? 'text-secondary border-secondary/40 bg-secondary/10'
      : match.status === 'pending'
      ? 'text-amber-400 border-amber-400/40 bg-amber-400/10'
      : 'text-zinc-500 border-zinc-700 bg-zinc-800/40';

  const copyId = () => {
    navigator.clipboard.writeText(matchId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-xl border border-white/8 bg-black overflow-hidden">
      {/* Meta row */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">Match</span>
          <button
            type="button"
            onClick={copyId}
            className="flex items-center gap-1.5 group"
            title={matchId}
          >
            <span className="font-mono text-xs text-zinc-400 group-hover:text-white transition-colors">
              #{matchId.slice(0, 8)}
            </span>
            {copied
              ? <Check className="w-3 h-3 text-secondary" />
              : <Copy className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
            }
          </button>
          {match.created_at && (
            <span className="hidden sm:block font-mono text-xs text-zinc-700">
              · {formatTime(match.created_at)}
            </span>
          )}
        </div>

        <span className={`font-mono text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded border flex items-center gap-1.5 ${statusClass}`}>
          {(match.status === 'active' || match.status === 'pending') && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {statusLabel}
        </span>
      </div>

      {/* VS row */}
      <div className="px-5 pb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Player 1 — left */}
        <Link
          to={p1Id ? `/agent/${p1Id}` : '#'}
          className="flex items-center gap-3 min-w-0 group"
        >
          <div className={`w-12 h-12 shrink-0 rounded-xl border p-0.5 transition-all duration-300 ${
            winnerIsP1
              ? 'border-primary shadow-[0_0_16px_rgba(223,127,62,0.4)]'
              : 'border-white/10 group-hover:border-blue-500/40'
          }`}>
            <img
              src={p1?.avatar_url || '/placeholder.png'}
              alt={p1?.name || 'P1'}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <p className={`font-black text-base uppercase italic tracking-tight leading-none truncate transition-colors ${
              winnerIsP1 ? 'text-primary' : 'text-white group-hover:text-blue-400'
            }`}>
              {p1?.name || 'Fighter 1'}
            </p>
            <p className="font-mono text-xs text-zinc-500 mt-1 leading-none">
              ELO {p1?.elo ?? '—'}
              {isFinished && winnerIsP1 && match.winner_elo_gain != null && (
                <span className="text-secondary ml-1.5">+{match.winner_elo_gain}</span>
              )}
              {isFinished && !winnerIsP1 && match.loser_elo_loss != null && (
                <span className="text-red-400/80 ml-1.5">−{match.loser_elo_loss}</span>
              )}
            </p>
          </div>
        </Link>

        {/* Center */}
        <div className="flex flex-col items-center gap-1 shrink-0 px-2">
          <span className="font-black text-xl text-zinc-700 italic uppercase tracking-tighter leading-none">VS</span>
          {isFinished && match.tx_hash && (
            <a
              href={`https://snowtrace.io/tx/${match.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 font-mono text-[10px] text-zinc-700 hover:text-secondary transition-colors uppercase tracking-widest"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Chain
            </a>
          )}
        </div>

        {/* Player 2 — right */}
        <Link
          to={p2Id ? `/agent/${p2Id}` : '#'}
          className="flex items-center gap-3 min-w-0 justify-end text-right group"
        >
          <div className="min-w-0">
            <p className={`font-black text-base uppercase italic tracking-tight leading-none truncate transition-colors ${
              winnerIsP2 ? 'text-primary' : 'text-white group-hover:text-secondary'
            }`}>
              {p2?.name || 'Fighter 2'}
            </p>
            <p className="font-mono text-xs text-zinc-500 mt-1 leading-none">
              {isFinished && winnerIsP2 && match.winner_elo_gain != null && (
                <span className="text-secondary mr-1.5">+{match.winner_elo_gain}</span>
              )}
              {isFinished && !winnerIsP2 && match.loser_elo_loss != null && (
                <span className="text-red-400/80 mr-1.5">−{match.loser_elo_loss}</span>
              )}
              ELO {p2?.elo ?? '—'}
            </p>
          </div>
          <div className={`w-12 h-12 shrink-0 rounded-xl border p-0.5 transition-all duration-300 ${
            winnerIsP2
              ? 'border-primary shadow-[0_0_16px_rgba(223,127,62,0.4)]'
              : 'border-white/10 group-hover:border-secondary/40'
          }`}>
            <img
              src={p2?.avatar_url || '/placeholder.png'}
              alt={p2?.name || 'P2'}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
