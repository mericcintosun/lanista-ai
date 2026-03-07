import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';

export function useSparkBalance(session: { access_token: string; user: { id: string } } | null) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!session?.access_token) {
      setBalance(0);
      setLoading(false);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.user?.id) return;

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
  }, [session?.user?.id]);

  return { balance, loading, refresh: fetchBalance };
}
