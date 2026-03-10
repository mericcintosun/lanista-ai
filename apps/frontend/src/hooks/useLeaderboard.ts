import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../lib/api';
import type { EloTierName } from '../lib/elo';

export interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
  elo?: number;
  reputationScore?: number;
  wallet_address?: string;
  displayRank?: number;
  trendDelta?: number;
}

export interface UseLeaderboardOptions {
  liveUpdates?: boolean;
  page?: number;
  limit?: number;
  tier?: EloTierName | '';
}

export function useLeaderboard(options: UseLeaderboardOptions | boolean = true) {
  const opts = typeof options === 'boolean'
    ? { liveUpdates: options, page: 1, limit: 20, tier: '' as const }
    : { liveUpdates: true, page: 1, limit: 20, tier: '' as const, ...options };

  const { liveUpdates, page, limit, tier } = opts;
  const [leaderboard, setLeaderboard] = useState<AgentScore[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
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

  const fetchLeaderboard = useCallback(async (isRefetch: boolean = false) => {
    if (!isRefetch) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (tier) params.set('tier', tier);
      const res = await fetch(`${API_URL}/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (data.leaderboard) {
        const incoming: AgentScore[] = data.leaderboard;
        const baseRank = (page - 1) * limit;
        const withDisplayRank: AgentScore[] = incoming.map((agent: AgentScore, idx: number) => ({
          ...agent,
          displayRank: baseRank + idx + 1,
        }));

        const withTrend: AgentScore[] = withDisplayRank.map((agent) => {
          const currentRank = agent.displayRank ?? 0;
          const prevRank = previousRanks[agent.id] ?? currentRank;
          const delta = prevRank - currentRank;
          return { ...agent, trendDelta: delta };
        });

        if (!tier && page === 1 && Object.keys(previousRanks).length === 0) {
          const nextPrev: Record<string, number> = {};
          withTrend.forEach((agent) => {
            if (agent.displayRank) nextPrev[agent.id] = agent.displayRank;
          });
          setPreviousRanks(nextPrev);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('hofPreviousRanks', JSON.stringify(nextPrev));
          }
        }
        setLeaderboard(withTrend);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, tier, previousRanks]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    const isRefetch = !isInitialMount.current;
    if (isInitialMount.current) isInitialMount.current = false;
    fetchLeaderboard(isRefetch);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!liveUpdates) return;
    const intervalId = setInterval(() => fetchLeaderboard(true), 3000);
    return () => clearInterval(intervalId);
  }, [liveUpdates, fetchLeaderboard]);

  return { leaderboard, loading, total, totalPages, page, limit, tier, refresh: fetchLeaderboard };
}
