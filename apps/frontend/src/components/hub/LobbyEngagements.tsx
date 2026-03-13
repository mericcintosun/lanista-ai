import { useNavigate, Link } from 'react-router-dom';
import type { Match } from '@lanista/types';
import { useEffect, useState } from 'react';
import { EmptyBox } from './ActiveQueue';
import { C } from '../../pages/Hub';

interface LobbyEngagementsProps { matches: Match[] }

function Countdown({ endsAt }: { endsAt?: Date | string }) {
  const [t, setT] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      const ms = new Date(endsAt).getTime() - Date.now();
      setT(ms <= 0 ? 'Starting' : `T-${Math.ceil(ms / 1000)}s`);
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return <>{t}</>;
}

export function LobbyEngagements({ matches }: LobbyEngagementsProps) {
  const navigate = useNavigate();
  const c = C.sky;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(10,14,20,0.85)', border: `1px solid ${c.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: c.base, boxShadow: `0 0 8px ${c.base}` }} />
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: c.base }}>
            Lobby Phase
          </span>
        </div>
        {matches.length > 0 && (
          <span className="font-mono text-xs font-black" style={{ color: c.base, opacity: 0.45 }}>
            {matches.length} pending
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="p-3 space-y-2">
        {matches.length > 0 ? matches.map(match => (
          <button key={match.id} onClick={() => navigate(`/game-arena/${match.id}`)} className="w-full text-left">
            <div
              className="relative flex items-center px-4 py-4 rounded-xl transition-all duration-150"
              style={{ background: 'rgba(79,163,227,0.04)', border: `1px solid ${c.border.replace('0.2)', '0.1)')}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,163,227,0.09)'; (e.currentTarget as HTMLDivElement).style.borderColor = c.border; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,163,227,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = c.border.replace('0.2)', '0.1)'); }}
            >
              {/* P1 */}
              <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                <div className="text-right min-w-0">
                  <Link to={`/agent/${match.player_1_id}`} onClick={e => e.stopPropagation()}
                    className="block text-sm font-black uppercase italic text-white tracking-tight truncate hover:underline">
                    {match.player_1?.name}
                  </Link>
                  <p className="text-xs font-mono uppercase tracking-widest mt-0.5 animate-pulse" style={{ color: c.base, opacity: 0.55 }}>
                    Open
                  </p>
                </div>
                <img src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                  alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10" />
              </div>

              {/* VS */}
              <div className="flex flex-col items-center mx-5 shrink-0 gap-0.5">
                <span className="font-mono text-[10px] tabular-nums" style={{ color: c.base, opacity: 0.4 }}>
                  {match.lobby_ends_at ? <Countdown endsAt={match.lobby_ends_at} /> : '—'}
                </span>
                <span className="font-black italic text-base" style={{ color: c.base, opacity: 0.5 }}>VS</span>
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.base, opacity: 0.35 }}>Join →</span>
              </div>

              {/* P2 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                  alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10" />
                <div className="min-w-0">
                  <Link to={`/agent/${match.player_2_id}`} onClick={e => e.stopPropagation()}
                    className="block text-sm font-black uppercase italic text-white tracking-tight truncate hover:underline">
                    {match.player_2?.name}
                  </Link>
                  <p className="text-xs font-mono uppercase tracking-widest mt-0.5 animate-pulse" style={{ color: c.base, opacity: 0.55 }}>
                    Open
                  </p>
                </div>
              </div>
            </div>
          </button>
        )) : (
          <EmptyBox color={c} label="Lobby Empty" sub="Waiting for match initialization…" />
        )}
      </div>
    </div>
  );
}
