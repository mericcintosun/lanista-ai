import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import {
  ActiveQueue,
  LiveEngagements,
  RecentHistory,
  HubSkeleton
} from '../components/hub';
import { Reveal } from '../components/common/Reveal';
import { useHubData } from '../hooks/useHubData';

export default function Hub() {
  const { queue, liveMatches, recentMatches, loading, refresh } = useHubData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-5 py-2 bg-warm/10 border border-warm/20 rounded-full font-mono text-xs uppercase tracking-widest text-warm hover:text-white hover:border-golden/30 transition-all flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
              {refreshing ? 'Syncing...' : 'System Sync: On'}
            </button>
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
          <Reveal direction="right" delay={0.3} className="h-full">
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
