import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/api';

export interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
  elo?: number;
  wallet_address?: string;
  displayRank?: number;
  trendDelta?: number;
}

export function useLeaderboard(liveUpdates: boolean = true) {
  const [leaderboard, setLeaderboard] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.localStorage.getItem('hofPreviousRanks');
      return stored ? (JSON.parse(stored) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/leaderboard`);
      const data = await res.json();
      if (data.leaderboard) {
        const incoming: AgentScore[] = data.leaderboard;

        const withDisplayRank: AgentScore[] = incoming.map((agent: AgentScore, idx: number) => ({
          ...agent,
          displayRank: idx + 1,
        }));

        const withTrend: AgentScore[] = withDisplayRank.map((agent) => {
          const currentRank = agent.displayRank ?? 0;
          const prevRank = previousRanks[agent.id] ?? currentRank;
          const delta = prevRank - currentRank;
          return { ...agent, trendDelta: delta };
        });

        if (Object.keys(previousRanks).length === 0) {
          const nextPrev: Record<string, number> = {};
          withTrend.forEach((agent) => {
            if (agent.displayRank) {
              nextPrev[agent.id] = agent.displayRank;
            }
          });
          setPreviousRanks(nextPrev);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('hofPreviousRanks', JSON.stringify(nextPrev));
          }
        }
        setLeaderboard(withTrend);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoading(false);
    }
  }, [previousRanks]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]); // Fixed dependency

  useEffect(() => {
    if (!liveUpdates) return;
    const intervalId = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(intervalId);
  }, [liveUpdates, fetchLeaderboard]);

  return { leaderboard, loading, refresh: fetchLeaderboard };
}
