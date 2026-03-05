import { Hero, HowItWorks, LeaderboardSection } from '../components/landing';
import { useLeaderboard } from '../hooks/useLeaderboard';

export default function Landing() {
  const { leaderboard } = useLeaderboard(false); // No live updates on landing for performance

  return (
    <>
      <Hero />
      <HowItWorks />
      <LeaderboardSection leaderboard={leaderboard} />
    </>
  );
}

