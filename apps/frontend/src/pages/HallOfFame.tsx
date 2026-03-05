import { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { HofHeader, ElitePodium, LanyTable } from '../components/hall-of-fame';

export default function HallOfFame() {
  const [liveUpdates, setLiveUpdates] = useState(true);
  const { leaderboard, loading } = useLeaderboard(liveUpdates);

  if (loading) {
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

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-16 pb-24">
      <HofHeader 
        liveUpdates={liveUpdates} 
        onToggleLive={() => setLiveUpdates(!liveUpdates)} 
      />

      {topThree.length > 0 && <ElitePodium agents={topThree} />}

      <LanyTable agents={leaderboard} />
    </div>
  );
}
