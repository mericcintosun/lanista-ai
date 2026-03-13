import { Link } from 'react-router-dom';
import { History, ChevronRight, ShieldCheck } from 'lucide-react';
import type { Match } from '@lanista/types';
import { C } from '../../pages/Hub';

interface RecentHistoryProps { recentMatches: Match[] }

export function RecentHistory({ recentMatches }: RecentHistoryProps) {
  const c = C.gold;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(16,13,6,0.85)', border: `1px solid ${c.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <History className="w-4 h-4" style={{ color: c.base }} />
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: c.base }}>
            Recent History
          </span>
        </div>
        {recentMatches.length > 0 && (
          <span className="font-mono text-xs font-black" style={{ color: c.base, opacity: 0.4 }}>
            {recentMatches.length} records
          </span>
        )}
      </div>

      {/* Column labels — desktop */}
      {recentMatches.length > 0 && (
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-white/[0.03]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20 w-24 shrink-0">Date / ID</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20 flex-1 text-center">Match</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20 w-24 text-right shrink-0">Action</span>
        </div>
      )}

      {/* Rows */}
      <div className="p-3 space-y-1">
        {recentMatches.length > 0 ? recentMatches.map(match => {
          const p1w = match.winner_id === match.player_1_id;
          const p2w = match.winner_id === match.player_2_id;
          const onChain = match.tx_hash && !match.tx_hash.startsWith('{');

          return (
            <div
              key={match.id}
              className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl transition-all duration-150"
              style={{ border: '1px solid transparent' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = c.dim;
                (e.currentTarget as HTMLDivElement).style.borderColor = c.border;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
              }}
            >
              {/* Date + ID */}
              <div className="w-20 sm:w-24 shrink-0">
                <p className="font-mono text-xs text-white/45 tabular-nums uppercase">
                  {new Date(match.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </p>
                <p className="font-mono text-[10px] text-white/25 mt-0.5">#{match.id.substring(0, 7)}</p>
              </div>

              {/* Match */}
              <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 min-w-0">
                {/* P1 */}
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <span className={`text-sm font-black uppercase italic tracking-tight truncate ${p1w ? 'text-white' : 'text-white/30'}`}>
                    {match.player_1_id
                      ? <Link to={`/agent/${match.player_1_id}`} onClick={e => e.stopPropagation()} className="hover:underline">{match.player_1?.name}</Link>
                      : match.player_1?.name}
                  </span>
                  <img
                    src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`}
                    alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 border"
                    style={{
                      borderColor: p1w ? c.border : 'rgba(255,255,255,0.06)',
                      opacity: p1w ? 1 : 0.35,
                      boxShadow: p1w ? `0 0 8px ${c.base}44` : 'none'
                    }}
                  />
                </div>

                {/* VS centre */}
                <div className="flex flex-col items-center gap-1 shrink-0 w-20 sm:w-24">
                  <span className="font-black text-xs italic text-white/25 uppercase tracking-tight">VS</span>
                  {onChain ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(12,165,90,0.12)', border: '1px solid rgba(12,165,90,0.25)' }}>
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="font-mono text-[9px] sm:text-[10px] text-emerald-400 uppercase font-bold tracking-wide">Secured</span>
                    </div>
                  ) : <div className="h-[18px]" />}
                </div>

                {/* P2 */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <img
                    src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`}
                    alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 border"
                    style={{
                      borderColor: p2w ? c.border : 'rgba(255,255,255,0.06)',
                      opacity: p2w ? 1 : 0.35,
                      boxShadow: p2w ? `0 0 8px ${c.base}44` : 'none'
                    }}
                  />
                  <span className={`text-sm font-black uppercase italic tracking-tight truncate ${p2w ? 'text-white' : 'text-white/30'}`}>
                    {match.player_2_id
                      ? <Link to={`/agent/${match.player_2_id}`} onClick={e => e.stopPropagation()} className="hover:underline">{match.player_2?.name}</Link>
                      : match.player_2?.name}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="w-20 sm:w-24 flex justify-end shrink-0">
                <Link
                  to={`/game-arena/${match.id}`}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase transition-all"
                  style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = c.base; (e.currentTarget as HTMLAnchorElement).style.borderColor = c.border; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <span className="hidden sm:inline tracking-widest">Details</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl gap-2"
            style={{ border: `1px dashed ${c.border}`, background: c.dim }}>
            <History className="w-5 h-5 opacity-30" style={{ color: c.base }} />
            <p className="font-mono text-sm font-black uppercase tracking-widest" style={{ color: c.base, opacity: 0.5 }}>No records yet</p>
            <p className="font-mono text-xs italic" style={{ color: c.base, opacity: 0.3 }}>Matches will appear after conclusion</p>
          </div>
        )}
      </div>
    </div>
  );
}
