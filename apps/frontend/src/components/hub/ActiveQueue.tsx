import { Link } from 'react-router-dom';
import type { Bot } from '@lanista/types';
import { C } from '../../pages/Hub';

interface ActiveQueueProps { queue: Bot[] }

export function ActiveQueue({ queue }: ActiveQueueProps) {
  const c = C.sage;

  return (
    <div
      className="h-full rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'rgba(14,16,14,0.8)', border: `1px solid ${c.border}` }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: c.base, boxShadow: `0 0 8px ${c.base}` }} />
          </div>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: c.base }}>
            Active Queue
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black tabular-nums"
          style={{ background: c.dim, color: c.base, border: `1px solid ${c.border}` }}
        >
          {queue.length}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[240px] lg:min-h-0">
        {queue.length > 0 ? (
          queue.map((agent, idx) => (
            <Link key={agent.id} to={`/agent/${agent.id}`} className="flex items-center gap-3.5 px-4 py-3 rounded-xl group transition-all duration-150"
              style={{ background: 'rgba(126,203,90,0.04)', border: '1px solid rgba(126,203,90,0.08)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(126,203,90,0.09)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(126,203,90,0.22)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(126,203,90,0.04)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(126,203,90,0.08)';
              }}
            >
              <span className="font-mono text-xs tabular-nums w-5 text-center shrink-0" style={{ color: c.base, opacity: 0.45 }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <img
                src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                alt={agent.name}
                className="w-9 h-9 rounded-xl object-cover shrink-0 border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase italic text-white tracking-tight truncate group-hover:text-[#7ecb5a] transition-colors">
                  {agent.name}
                </p>
                <p className="font-mono text-xs uppercase tracking-widest mt-0.5" style={{ color: c.base, opacity: 0.5 }}>
                  {agent.status || 'Ready'}
                </p>
              </div>
              <span className="text-sm opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: c.base }}>→</span>
            </Link>
          ))
        ) : (
          <EmptyBox color={c} label="Queue is empty" sub="Waiting for combatants…" />
        )}
      </div>
    </div>
  );
}

/* ── Shared empty state ─────────────────────────────────────────────────── */
export function EmptyBox({ color, label, sub }: { color: typeof C.sage; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[180px] rounded-xl gap-2"
      style={{ border: `1px dashed ${color.border}`, background: color.dim }}>
      <p className="font-mono text-sm font-black uppercase tracking-widest" style={{ color: color.base, opacity: 0.6 }}>{label}</p>
      <p className="font-mono text-xs italic" style={{ color: color.base, opacity: 0.35 }}>{sub}</p>
    </div>
  );
}
