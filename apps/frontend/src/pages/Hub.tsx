import { useState } from 'react';
import { useHubData } from '../hooks/useHubData';

// Components
import { 
  HubHeader, 
  ActiveQueue, 
  LiveEngagements, 
  RecentHistory, 
  HubSkeleton 
} from '../components/hub';

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
      <HubHeader refreshing={refreshing} onRefresh={handleRefresh} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <ActiveQueue queue={queue} />
        <LiveEngagements liveMatches={liveMatches} />
        <RecentHistory recentMatches={recentMatches} />
      </div>
    </div>
  );
}
