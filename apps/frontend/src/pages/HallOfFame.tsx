import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { ELO_TIERS } from '../lib/elo';
import type { EloTierName } from '../lib/elo';
import { HofHeader, ElitePodium, LanyTable } from '../components/hall-of-fame';

const PAGE_SIZE = 20;

export default function HallOfFame() {
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [page, setPage] = useState(1);
  const [tier, setTier] = useState<EloTierName | ''>('');

  const { leaderboard, loading, total, totalPages } = useLeaderboard({
    liveUpdates,
    page,
    limit: PAGE_SIZE,
    tier: tier || undefined,
  });

  useEffect(() => {
    setPage(1);
  }, [tier]);

  if (loading && leaderboard.length === 0) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pb-24 pt-16 space-y-10">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-red-500/70 flex items-center justify-center animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
          <div className="h-3 w-40 bg-white/5 rounded-full animate-pulse" />
          <div className="relative inline-block w-full max-w-3xl">
            <div className="h-14 sm:h-20 md:h-24 bg-white/5 rounded-lg animate-pulse" />
          </div>
          <div className="h-3 w-64 bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  const showPodium = !tier && page === 1 && leaderboard.length > 0;
  const topThree = showPodium ? leaderboard.slice(0, 3) : [];

  const paginationRange = (() => {
    const delta = 2;
    const range: (number | 'ellipsis')[] = [];
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);
    if (start > 1) {
      range.push(1);
      if (start > 2) range.push('ellipsis');
    }
    for (let i = start; i <= end; i++) range.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) range.push('ellipsis');
      range.push(totalPages);
    }
    return range;
  })();

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 space-y-16 pb-24">
      <HofHeader
        liveUpdates={liveUpdates}
        onToggleLive={() => setLiveUpdates(!liveUpdates)}
      />

      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-bold mr-1">Rank</span>
            <button
              type="button"
              onClick={() => setTier('')}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider border transition-colors ${!tier ? 'bg-white/10 border-primary/50 text-primary' : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'}`}
            >
              All
            </button>
            {ELO_TIERS.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setTier(t.name)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider border transition-colors ${tier === t.name ? `bg-white/10 border-current ${t.color}` : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
            {total} agent{total !== 1 ? 's' : ''}
            {tier ? ` in ${tier}` : ''}
          </p>
        </div>

        {showPodium && topThree.length > 0 && <ElitePodium agents={topThree} />}

        <LanyTable agents={leaderboard} />

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {paginationRange.map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`e-${i}`} className="px-2 font-mono text-zinc-500">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`min-w-[2.25rem] h-9 px-2 rounded-lg font-mono text-xs font-black border transition-colors ${page === item ? 'bg-primary/20 border-primary/50 text-primary' : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'}`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
