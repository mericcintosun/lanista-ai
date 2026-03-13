import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Match } from '@lanista/types';

/* Colour tokens — vibrant */
const FIRE = { b: '#f0894e', dim: 'rgba(240,137,78,0.15)', ring: 'rgba(240,137,78,0.4)' };
const SKY  = { b: '#5bb3f5', dim: 'rgba(91,179,245,0.15)', ring: 'rgba(91,179,245,0.4)'  };
const SAGE = { b: '#8ed468' };

interface MatchInfoBannerProps { match: Match; matchId: string }

function fmt(ts: string) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function MatchInfoBanner({ match, matchId }: MatchInfoBannerProps) {
  const [copied, setCopied] = useState(false);
  const p1 = match.player_1;
  const p2 = match.player_2;
  const p1Id = match.player_1_id ?? p1?.id;
  const p2Id = match.player_2_id ?? p2?.id;
  const isFinished = match.status === 'finished' || match.status === 'aborted';

  const winnerIsP1 = (() => {
    if (!isFinished) return match.winner_id === p1Id;
    const p1Hp = p1?.current_hp ?? 0, p2Hp = p2?.current_hp ?? 0;
    if (p1Hp > 0 && p2Hp <= 0) return true;
    if (p2Hp > 0 && p1Hp <= 0) return false;
    return match.winner_id === p1Id;
  })();
  const winnerIsP2 = !winnerIsP1 && isFinished && !!match.winner_id;

  const onChain = isFinished && match.tx_hash && !match.tx_hash.startsWith('{');

  const statusC = match.status === 'active' ? FIRE
    : match.status === 'pending' ? SKY
    : { b: '#6b7280', dim: 'rgba(107,114,128,0.12)', ring: 'rgba(107,114,128,0.3)' };

  const statusLabel = match.status === 'active' ? 'Live'
    : match.status === 'pending' ? 'Preparing'
    : match.status === 'finished' ? 'Archived' : 'Aborted';

  const copyId = () => {
    navigator.clipboard.writeText(matchId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.1)' }}>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Match</span>
          <button type="button" onClick={copyId} className="flex items-center gap-1.5 group" title={matchId}>
            <span className="font-mono text-xs text-white/55 group-hover:text-white transition-colors font-bold">
              #{matchId.slice(0, 8)}
            </span>
            {copied
              ? <Check className="w-3 h-3" style={{ color: SAGE.b }} />
              : <Copy className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
            }
          </button>
          {match.created_at && (
            <span className="hidden sm:block font-mono text-[10px] text-white/25">· {fmt(match.created_at)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onChain && (
            <a href={`https://testnet.snowtrace.io/tx/${match.tx_hash}#eventlog`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              <ShieldCheck className="w-3 h-3" />
              <span className="hidden sm:inline">On-chain</span>
              <ExternalLink className="w-2 h-2" />
            </a>
          )}
          <span className="font-mono text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ background: statusC.dim, border: `1px solid ${statusC.ring}`, color: statusC.b }}>
            {(match.status === 'active' || match.status === 'pending') && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusC.b }} />
            )}
            {statusLabel}
          </span>
        </div>
      </div>

      {/* VS row */}
      <div className="px-5 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* P1 */}
        <Link to={p1Id ? `/agent/${p1Id}` : '#'} className="flex items-center gap-3 min-w-0 group">
          <div className="shrink-0 p-[2px] rounded-2xl transition-all duration-300"
            style={{
              border: `2px solid ${winnerIsP1 ? FIRE.b : 'rgba(255,255,255,0.1)'}`,
              boxShadow: winnerIsP1 ? `0 0 20px ${FIRE.ring}` : 'none',
            }}>
            <img src={p1?.avatar_url || '/placeholder.png'} alt={p1?.name || 'P1'}
              className="w-12 h-12 object-cover rounded-xl" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-base sm:text-lg uppercase italic tracking-tight truncate transition-colors"
              style={{ color: winnerIsP1 ? FIRE.b : 'rgba(255,255,255,0.9)' }}>
              {p1?.name || 'Fighter 1'}
            </p>
            <p className="font-mono text-xs text-white/35 mt-1 leading-none">
              ELO {p1?.elo ?? '—'}
              {isFinished && winnerIsP1 && match.winner_elo_gain != null && (
                <span className="ml-2 font-bold" style={{ color: SAGE.b }}>+{match.winner_elo_gain}</span>
              )}
              {isFinished && !winnerIsP1 && match.loser_elo_loss != null && (
                <span className="ml-2 font-bold text-red-400">−{match.loser_elo_loss}</span>
              )}
            </p>
          </div>
        </Link>

        {/* VS */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-px h-5 opacity-15" style={{ background: 'white' }} />
          <span className="font-black italic text-xl py-1 leading-none" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</span>
          <div className="w-px h-5 opacity-15" style={{ background: 'white' }} />
        </div>

        {/* P2 */}
        <Link to={p2Id ? `/agent/${p2Id}` : '#'} className="flex items-center gap-3 min-w-0 justify-end text-right group">
          <div className="min-w-0">
            <p className="font-black text-base sm:text-lg uppercase italic tracking-tight truncate transition-colors"
              style={{ color: winnerIsP2 ? FIRE.b : 'rgba(255,255,255,0.9)' }}>
              {p2?.name || 'Fighter 2'}
            </p>
            <p className="font-mono text-xs text-white/35 mt-1 leading-none">
              {isFinished && winnerIsP2 && match.winner_elo_gain != null && (
                <span className="mr-2 font-bold" style={{ color: SAGE.b }}>+{match.winner_elo_gain}</span>
              )}
              {isFinished && !winnerIsP2 && match.loser_elo_loss != null && (
                <span className="mr-2 font-bold text-red-400">−{match.loser_elo_loss}</span>
              )}
              ELO {p2?.elo ?? '—'}
            </p>
          </div>
          <div className="shrink-0 p-[2px] rounded-2xl transition-all duration-300"
            style={{
              border: `2px solid ${winnerIsP2 ? FIRE.b : 'rgba(255,255,255,0.1)'}`,
              boxShadow: winnerIsP2 ? `0 0 20px ${FIRE.ring}` : 'none',
            }}>
            <img src={p2?.avatar_url || '/placeholder.png'} alt={p2?.name || 'P2'}
              className="w-12 h-12 object-cover rounded-xl" />
          </div>
        </Link>
      </div>
    </div>
  );
}
