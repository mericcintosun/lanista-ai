import { useState } from 'react';
import {
  ActiveQueue,
  LiveEngagements,
  LobbyEngagements,
  RecentHistory,
  HubSkeleton
} from '../components/hub';
import { useHubData } from '../hooks/useHubData';
import { API_URL } from '../lib/api';
import { RefreshCw, Users, Swords, Clock, History } from 'lucide-react';

/* ─── Colour tokens (not Tailwind-dependent) ────────────────────────────── */
export const C = {
  sage:    { base: '#7ecb5a', dim: 'rgba(126,203,90,0.12)',  border: 'rgba(126,203,90,0.2)'  },
  sky:     { base: '#4fa3e3', dim: 'rgba(79,163,227,0.12)', border: 'rgba(79,163,227,0.2)'  },
  fire:    { base: '#e8813c', dim: 'rgba(232,129,60,0.12)', border: 'rgba(232,129,60,0.2)'  },
  gold:    { base: '#d4a94a', dim: 'rgba(212,169,74,0.12)', border: 'rgba(212,169,74,0.2)'  },
} as const;

export default function Hub() {
  const { queue, lobbyMatches, liveMatches, recentMatches, loading, refresh } = useHubData();
  const [refreshing, setRefreshing] = useState(false);
  const [spawning, setSpawning]     = useState(false);
  const [requeuing, setRequeuing]   = useState(false);

  const handleRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const handleSpawn   = async () => {
    setSpawning(true);
    try {
      const r = await fetch(`${API_URL}/dev/dummy-register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({count:4}) });
      if (r.ok) await refresh();
    } catch { /* noop */ } finally { setSpawning(false); }
  };
  const handleRequeue = async () => {
    setRequeuing(true);
    try { const r = await fetch(`${API_URL}/dev/dummy-requeue`, {method:'POST'}); if (r.ok) await refresh(); }
    catch { /* noop */ } finally { setRequeuing(false); }
  };

  if (loading) return <HubSkeleton />;

  return (
    <div className="w-full max-w-[1480px] mx-auto px-3 sm:px-5 lg:px-6 pb-24">

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="pt-4 pb-8 sm:pb-10">
        {/* title row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="font-mono text-xs text-[#e8813c] uppercase tracking-[0.35em] mb-2 opacity-80">
              // Arena Command Center
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter text-white uppercase leading-[0.88]">
              The Hub
            </h1>
          </div>

          {/* Dev controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: refreshing ? 'Syncing…' : 'Sync', icon: <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />, fn: handleRefresh, busy: refreshing },
              { label: spawning  ? 'Spawning…' : 'Spawn Agents',  icon: null, fn: handleSpawn,   busy: spawning  },
              { label: requeuing ? 'Queuing…'  : 'Requeue',       icon: null, fn: handleRequeue, busy: requeuing },
            ].map(btn => (
              <button key={btn.label} onClick={btn.fn} disabled={btn.busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 border border-white/8 hover:border-white/18 transition-all font-mono text-[11px] uppercase tracking-wider disabled:opacity-30 bg-white/[0.02]">
                {btn.icon ?? (btn.busy ? <span className="w-2 h-2 rounded-full bg-[#e8813c] animate-pulse" /> : null)}
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<Users  className="w-4 h-4"/>} label="In Queue" value={queue.length}          c={C.sage} />
          <Stat icon={<Clock  className="w-4 h-4"/>} label="In Lobby" value={lobbyMatches.length}   c={C.sky}  />
          <Stat icon={<Swords className="w-4 h-4"/>} label="Live Now" value={liveMatches.length}    c={C.fire} pulse />
          <Stat icon={<History className="w-4 h-4"/>} label="Recent"  value={recentMatches.length}  c={C.gold} />
        </div>
      </div>

      {/* ═══ MAIN GRID ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

        {/* Queue — 4 cols */}
        <div className="lg:col-span-4">
          <ActiveQueue queue={queue} />
        </div>

        {/* Lobby + Live — 8 cols stacked */}
        <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-5">
          <LobbyEngagements matches={lobbyMatches || []} />
          <LiveEngagements  liveMatches={liveMatches} />
        </div>

        {/* History — full width */}
        <div className="lg:col-span-12">
          <RecentHistory recentMatches={recentMatches} />
        </div>
      </div>
    </div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────────── */
function Stat({
  icon, label, value, c, pulse = false
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  c: { base: string, dim: string, border: string };
  pulse?: boolean;
}) {
  const on = value > 0;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors"
      style={{ background: on ? c.dim : 'rgba(255,255,255,0.02)', border: `1px solid ${on ? c.border : 'rgba(255,255,255,0.06)'}` }}
    >
      {/* live dot */}
      <div className="relative shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${pulse && on ? 'animate-pulse' : ''}`}
          style={{ background: on ? c.base : 'rgba(255,255,255,0.15)' }}
        />
        {pulse && on && (
          <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: c.base }} />
        )}
      </div>

      {/* label */}
      <div className="flex items-center gap-2 flex-1 min-w-0" style={{ color: on ? c.base : 'rgba(255,255,255,0.25)' }}>
        <span className="shrink-0 opacity-70">{icon}</span>
        <span className="font-mono text-xs uppercase tracking-widest truncate">
          {label}
        </span>
      </div>

      {/* value */}
      <span className="font-black text-xl tabular-nums leading-none"
        style={{ color: on ? c.base : 'rgba(255,255,255,0.18)' }}>
        {value}
      </span>
    </div>
  );
}
