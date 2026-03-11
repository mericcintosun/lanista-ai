import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { useSparkStore } from '../lib/spark-store';
import { useAuthStore } from '../lib/auth-store';

/**
 * useSparkBalance: Hook to fetch and sync global Spark balance.
 * Uses Zustand stores (auth + spark) for UI-wide synchronization, plus Supabase
 * PostGres Realtime to keep it up to date.
 */
export function useSparkBalance() {
  const session = useAuthStore((s) => s.session);
  const { balance, setBalance, isLoading, setIsLoading } = useSparkStore();

  const fetchBalance = useCallback(async () => {
    if (!session?.access_token) {
      setBalance(0);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/sparks/balance`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch {
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, setBalance, setIsLoading]);

  useEffect(() => {
    fetchBalance();

    // Refresh when tab becomes visible again
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchBalance();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Poll every 30s as fallback in case Realtime misses an event
    const interval = setInterval(fetchBalance, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchBalance]);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Supabase Realtime subscription for DB-level balance updates
    const channel = supabase
      .channel(`spark-balance-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spark_balances',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { balance?: number };
          if (typeof row?.balance === 'number') setBalance(row.balance);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, setBalance]);

  return { balance, loading: isLoading, refresh: fetchBalance, setBalance };
}
