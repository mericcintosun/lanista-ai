import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import {
  ActiveQueue,
  LiveEngagements,
  LobbyEngagements,
  RecentHistory,
  HubSkeleton
} from '../components/hub';
import { Reveal } from '../components/common/Reveal';
import { useHubData } from '../hooks/useHubData';
import { API_URL } from '../lib/api';

const btnBase =
  'px-5 py-2 bg-warm/10 border border-warm/20 rounded-full font-mono text-xs uppercase tracking-widest text-warm hover:text-white hover:border-golden/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

export default function Hub() {
  const { queue, lobbyMatches, liveMatches, recentMatches, loading, refresh } = useHubData();
  const [refreshing, setRefreshing] = useState(false);
  const [dummyRegistering, setDummyRegistering] = useState(false);
  const [dummyRequeuing, setDummyRequeuing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDummyRegister = async () => {
    setDummyRegistering(true);
    try {
      const res = await fetch(`${API_URL}/dev/dummy-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 4 }),
      });
      if (res.ok) await refresh();
    } catch { /* silent */ } finally {
      setDummyRegistering(false);
    }
  };

  const handleDummyRequeue = async () => {
    setDummyRequeuing(true);
    try {
      const res = await fetch(`${API_URL}/dev/dummy-requeue`, { method: 'POST' });
      if (res.ok) await refresh();
    } catch { /* silent */ } finally {
      setDummyRequeuing(false);
    }
  };

  if (loading) {
    return <HubSkeleton />;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-24 pb-32">
      <Reveal>
        <PageHeader 
          title="THE HUB" 
          actions={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={btnBase}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
                {refreshing ? 'Updating...' : 'Up to date'}
              </button>
              <button
                onClick={handleDummyRegister}
                disabled={dummyRegistering}
                className={btnBase}
              >
                {dummyRegistering ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ) : null}
                {dummyRegistering ? 'Spawning...' : 'Spawn Test Agents'}
              </button>
              <button
                onClick={handleDummyRequeue}
                disabled={dummyRequeuing}
                className={btnBase}
              >
                {dummyRequeuing ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ) : null}
                {dummyRequeuing ? 'Queuing...' : 'Requeue Agents'}
              </button>
            </div>
          }
        />
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
        <div className="lg:col-span-4 h-full">
          <Reveal direction="left" delay={0.2} className="h-full">
            <ActiveQueue queue={queue} />
          </Reveal>
        </div>
        <div className="lg:col-span-8 h-full">
          <Reveal direction="right" delay={0.3} className="h-full flex flex-col gap-8">
            <LobbyEngagements matches={lobbyMatches || []} />
            <LiveEngagements liveMatches={liveMatches} />
          </Reveal>
        </div>
        <div className="lg:col-span-12">
          <Reveal direction="up" delay={0.4}>
            <RecentHistory recentMatches={recentMatches} />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
