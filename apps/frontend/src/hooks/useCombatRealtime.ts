import { useState, useEffect } from 'react';
import type { Match, CombatLog } from '@lanista/types';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';

export function useCombatRealtime(matchId: string | null) {
  const [match, setMatch] = useState<Match | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);

  useEffect(() => {
    if (!matchId) return;

    const fetchMatch = async () => {
      try {
        const res = await fetch(`${API_URL}/combat/status?matchId=${matchId}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedMatch = data.match;

          setLogs(data.logs || []);

          if (fetchedMatch.player_1) {
            fetchedMatch.player_1.current_hp = fetchedMatch.p1_current_hp ?? fetchedMatch.player_1.hp;
          }
          if (fetchedMatch.player_2) {
            fetchedMatch.player_2.current_hp = fetchedMatch.p2_current_hp ?? fetchedMatch.player_2.hp;
          }
          if (!fetchedMatch.player_1?.current_hp && data.logs?.length) {
            let p1_hp = fetchedMatch.player_1?.hp ?? 100;
            let p2_hp = fetchedMatch.player_2?.hp ?? 100;
            data.logs.forEach((log: CombatLog) => {
              if (log.actor_id === fetchedMatch.player_2?.id) p1_hp = log.target_current_hp;
              else p2_hp = log.target_current_hp;
            });
            if (fetchedMatch.player_1) fetchedMatch.player_1.current_hp = p1_hp;
            if (fetchedMatch.player_2) fetchedMatch.player_2.current_hp = p2_hp;
          }

          setMatch(fetchedMatch);
        }
      } catch (err) {
        console.error('Failed to fetch match status', err);
      }
    };

    fetchMatch();

    // Realtime subscription for instant updates
    const channel = supabase
      .channel(`combat-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'combat_logs',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newLog = payload.new as CombatLog;
          setLogs((prev) => [...prev, newLog]);
          setMatch((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            if (next.player_1 && next.player_2) {
              const targetIsP1 = newLog.actor_id === next.player_2.id;
              if (targetIsP1) next.player_1.current_hp = newLog.target_current_hp;
              else next.player_2.current_hp = newLog.target_current_hp;
              if (newLog.target_current_hp <= 0) {
                next.status = 'finished';
                next.winner_id = newLog.actor_id;
              }
            }
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as { p1_current_hp?: number; p2_current_hp?: number; status?: string; winner_id?: string };
          setMatch((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            if (updated.p1_current_hp != null && next.player_1) next.player_1.current_hp = updated.p1_current_hp;
            if (updated.p2_current_hp != null && next.player_2) next.player_2.current_hp = updated.p2_current_hp;
            if (updated.status) next.status = updated.status as Match['status'];
            if (updated.winner_id) next.winner_id = updated.winner_id;
            return next;
          });
        }
      )
      .subscribe();

    // Polling fallback: re-fetch every 3s in case realtime misses an event
    // Stops once match is finished
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/combat/status?matchId=${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.logs?.length) {
          setLogs(data.logs);
        }
        if (data.match) {
          const m = data.match;
          setMatch((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            if (m.p1_current_hp != null && next.player_1) next.player_1.current_hp = m.p1_current_hp;
            if (m.p2_current_hp != null && next.player_2) next.player_2.current_hp = m.p2_current_hp;
            if (m.status) next.status = m.status;
            if (m.winner_id) next.winner_id = m.winner_id;
            return next;
          });
          // Stop polling when match is done
          if (m.status === 'finished' || m.status === 'aborted') {
            clearInterval(poll);
          }
        }
      } catch { /* silent fallback */ }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [matchId]);

  return { match, logs, setMatch, setLogs };
}
