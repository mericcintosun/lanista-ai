import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';

/**
 * useSupportPools — fetches the global support pool totals for a match.
 * Uses REST API for initial load, then uses Supabase Realtime (WebSocket)
 * to listen for instantly emerging support transactions, saving HTTP calls
 * and providing a real-time multiplayer feel.
 */
export function useSupportPools(matchId: string | undefined) {
  const [bluePool, setBluePool] = useState(0);
  const [greenPool, setGreenPool] = useState(0);

  // 1. Initial Data Fetch
  const fetchPools = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await fetch(`${API_URL}/hub/pools/${matchId}`);
      if (!res.ok) return;
      const data = await res.json();
      setBluePool(data.bluePool || 0);
      setGreenPool(data.greenPool || 0);
    } catch (err) {
      // SILENT ignore: non-essential feature
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    fetchPools();
  }, [matchId, fetchPools]);

  // 2. Realtime WebSocket Subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`support_pools_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spark_transactions',
          filter: `reference_id=eq.${matchId}`
        },
        (payload) => {
          const tx = payload.new as { transaction_type: string; amount: number };
          if (!tx || !tx.transaction_type || tx.amount == null) return;
          
          if (tx.transaction_type === 'support_player_1') {
            setBluePool((prev) => prev + Math.abs(Number(tx.amount)));
          } else if (tx.transaction_type === 'support_player_2') {
            setGreenPool((prev) => prev + Math.abs(Number(tx.amount)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  return { bluePool, greenPool, setBluePool, setGreenPool };
}
