import { useState, useEffect } from 'react';
import type { Match, CombatLog } from '@lanista/types';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';

export function useCombatRealtime(matchId: string | null) {
  const [match, setMatch] = useState<Match | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);

  const signalReady = async () => {
    if (!matchId) return;
    try {
      await fetch(`${API_URL}/combat/viewer-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      });
      console.log('[ViewerReady] Signal sent successfully');
    } catch (err) {
      console.error('[ViewerReady] Signal failed', err);
    }
  };

  useEffect(() => {
    if (!matchId) return;

    const fetchMatch = async () => {
      try {
        const res = await fetch(`${API_URL}/combat/status/${matchId}`);
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
          setLogs((prev) => {
            // Avoid duplicates
            if (prev.some(l => l.id === newLog.id)) return prev;
            return [...prev, newLog];
          });
          
          setMatch((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            // Update HP based on the log
            if (next.player_1 && next.player_2) {
                // If the actor is P2, damage is dealt to P1
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
          const updated = payload.new as Partial<Match> & { p1_current_hp?: number; p2_current_hp?: number };
          setMatch((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            if (updated.p1_current_hp !== undefined && next.player_1) next.player_1.current_hp = updated.p1_current_hp;
            if (updated.p2_current_hp !== undefined && next.player_2) next.player_2.current_hp = updated.p2_current_hp;
            if (updated.status) next.status = updated.status;
            if (updated.winner_id) next.winner_id = updated.winner_id;
            return next;
          });
        }
      )
      .subscribe();

    // Polling fallback: re-fetch every 2s in case realtime misses an event
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/combat/status/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.logs?.length) {
          setLogs(prev => {
             const newLogs = data.logs.filter((nl: CombatLog) => !prev.some(pl => pl.id === nl.id));
             return [...prev, ...newLogs];
          });
        }
        
        if (data.match) {
          const m = data.match;
          setMatch((prev) => {
            if (!prev) return data.match;
            const next = { ...prev, ...m };
            // Ensure nested hp is updated
            if (next.player_1) next.player_1.current_hp = m.p1_current_hp ?? next.player_1.current_hp;
            if (next.player_2) next.player_2.current_hp = m.p2_current_hp ?? next.player_2.current_hp;
            return next;
          });

          if (m.status === 'finished' || m.status === 'aborted') {
            clearInterval(poll);
          }
        }
      } catch { /* silent fallback */ }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [matchId]);

  return { match, logs, setMatch, setLogs, signalReady };
}
