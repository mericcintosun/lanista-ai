import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/api';
import type { Match, Bot } from '@lanista/types';

export function useHubData() {
  const [queue, setQueue] = useState<Bot[]>([]);
  const [lobbyMatches, setLobbyMatches] = useState<Match[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [lobbyRes, liveRes, recentRes, queueRes] = await Promise.all([
        fetch(`${API_URL}/hub/lobby`).then(r => r.json()).catch(() => ({ matches: [] })),
        fetch(`${API_URL}/hub/live`).then(r => r.json()).catch(() => ({ matches: [] })),
        fetch(`${API_URL}/hub/recent`).then(r => r.json()).catch(() => ({ matches: [] })),
        fetch(`${API_URL}/hub/queue`).then(r => r.json()).catch(() => ({ queue: [] })),
      ]);

      if (lobbyRes.matches) setLobbyMatches(lobbyRes.matches);
      if (liveRes.matches) setLiveMatches(liveRes.matches);
      if (recentRes.matches) setRecentMatches(recentRes.matches);
      if (queueRes.queue) setQueue(queueRes.queue);
    } catch (err) {
      console.error("Failed to fetch hub data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { queue, lobbyMatches, liveMatches, recentMatches, loading, refresh: fetchData };
}
