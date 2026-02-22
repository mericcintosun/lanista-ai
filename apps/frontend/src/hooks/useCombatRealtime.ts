import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Match, CombatLog } from '@lanista/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function useCombatRealtime(matchId: string | null) {
  const [match, setMatch] = useState<Match | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);

  useEffect(() => {
    if (!matchId) return;

    const fetchMatch = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/combat/status?matchId=${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data.match);
          if (data.logs) {
            setLogs(data.logs);
          }
        }
      } catch (err) {
        console.error('Failed to fetch match status', err);
      }
    };

    fetchMatch();

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
              
              if (targetIsP1) {
                next.player_1.current_hp = newLog.target_current_hp;
              } else {
                next.player_2.current_hp = newLog.target_current_hp;
              }

              if (newLog.target_current_hp <= 0) {
                next.status = 'finished';
              }
            }
            
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  return { match, logs, setMatch, setLogs };
}
