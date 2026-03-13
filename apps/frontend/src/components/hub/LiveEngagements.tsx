import { useNavigate, Link } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { Radio } from 'lucide-react';
import type { Match } from '@lanista/types';
import { EmptyBox } from './ActiveQueue';
import { C } from '../../pages/Hub';

interface LiveEngagementsProps { liveMatches: Match[] }

export function LiveEngagements({ liveMatches }: LiveEngagementsProps) {
  const navigate = useNavigate();
  const c = C.fire;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(18,12,8,0.85)', border: `1px solid ${c.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: c.base, boxShadow: `0 0 10px ${c.base}` }} />
            <div className="absolute inset-0 rounded-full animate-ping opacity-35" style={{ background: c.base }} />
          </div>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: c.base }}>
            Live Engagements
          </span>
        </div>
        {liveMatches.length > 0 && (
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: c.base }} />
            <span className="font-mono text-xs font-black" style={{ color: c.base, opacity: 0.5 }}>
              {liveMatches.length} live
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="p-3 space-y-2">
        {liveMatches.length > 0 ? liveMatches.map(match => (
          <button key={match.id} onClick={() => navigate(`/game-arena/${match.id}`)}
            onMouseEnter={prefetchGameHtml} onTouchStart={prefetchGameHtml}
            className="w-full text-left"
          >
            <div
              className="relative flex items-center px-4 py-4 rounded-xl transition-all duration-150"
              style={{ background: 'rgba(232,129,60,0.05)', border: `1px solid ${c.border.replace('0.2)', '0.1)')}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(232,129,60,0.1)'; (e.currentTarget as HTMLDivElement).style.borderColor = c.border; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(232,129,60,0.05)'; (e.currentTarget as HTMLDivElement).style.borderColor = c.border.replace('0.2)', '0.1)'); }}
            >
              {/* P1 */}
              <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                <div className="text-right min-w-0">
                  <Link to={`/agent/${match.player_1_id}`} onClick={e => e.stopPropagation()}
                    className="block text-sm font-black uppercase italic text-white tracking-tight truncate hover:underline">
                    {match.player_1?.name}
                  </Link>
                  <p className="text-xs font-mono uppercase tracking-widest mt-0.5" style={{ color: c.base, opacity: 0.45 }}>
                    Active
                  </p>
                </div>
                <div className="relative shrink-0">
                  <img src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                    alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                  {/* live dot badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#120c08]"
                    style={{ background: c.base, boxShadow: `0 0 6px ${c.base}` }} />
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center mx-5 shrink-0">
                <div className="w-px h-5 bg-gradient-to-b from-transparent to-current opacity-20" style={{ color: c.base }} />
                <span className="font-black italic text-base py-0.5" style={{ color: c.base, opacity: 0.55 }}>VS</span>
                <div className="w-px h-5 bg-gradient-to-t from-transparent to-current opacity-20" style={{ color: c.base }} />
              </div>

              {/* P2 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative shrink-0">
                  <img src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                    alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#120c08]"
                    style={{ background: c.base, boxShadow: `0 0 6px ${c.base}` }} />
                </div>
                <div className="min-w-0">
                  <Link to={`/agent/${match.player_2_id}`} onClick={e => e.stopPropagation()}
                    className="block text-sm font-black uppercase italic text-white tracking-tight truncate hover:underline">
                    {match.player_2?.name}
                  </Link>
                  <p className="text-xs font-mono uppercase tracking-widest mt-0.5" style={{ color: c.base, opacity: 0.45 }}>
                    Active
                  </p>
                </div>
              </div>

              {/* Watch CTA */}
              <span className="ml-4 shrink-0 font-mono text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity" style={{ color: c.base }}>
                Watch →
              </span>
            </div>
          </button>
        )) : (
          <EmptyBox color={c} label="Offline" sub="Waiting for broadcast…" />
        )}
      </div>
    </div>
  );
}
