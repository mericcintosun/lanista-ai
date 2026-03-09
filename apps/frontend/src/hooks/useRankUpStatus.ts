import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/api';

export interface RankUpStatus {
  found: boolean;
  requestId?: string;
  walletAddress?: string;
  newRankIndex?: number;
  matchId?: string;
  itemId?: number | null;
  fulfilled?: boolean;
  fulfilledAt?: string | null;
  createdAt?: string;
}

export function useRankUpStatus(botId: string | null, pollIntervalMs = 5000) {
  const [status, setStatus] = useState<RankUpStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!botId) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/oracle/rank-up-status/${botId}`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Rank-up status fetch failed:', err);
      setStatus({ found: false });
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    fetchStatus();
    if (!botId) return;
    const interval = setInterval(fetchStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [botId, pollIntervalMs, fetchStatus]);

  return { status, loading, refresh: fetchStatus };
}
