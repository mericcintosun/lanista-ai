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
          const fetchedMatch = data.match;

          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
            
            // Reconstruct current health from logs
            if (fetchedMatch.player_1 && fetchedMatch.player_2) {
               let p1_hp = fetchedMatch.player_1.hp;
               let p2_hp = fetchedMatch.player_2.hp;

               data.logs.forEach((log: CombatLog) => {
                 if (log.actor_id === fetchedMatch.player_2.id) {
                     p1_hp = log.target_current_hp;
                 } else {
                     p2_hp = log.target_current_hp;
                 }
               });
               
               fetchedMatch.player_1.current_hp = p1_hp;
               fetchedMatch.player_2.current_hp = p2_hp;
            }
          } else {
             if (fetchedMatch.player_1) fetchedMatch.player_1.current_hp = fetchedMatch.player_1.hp;
             if (fetchedMatch.player_2) fetchedMatch.player_2.current_hp = fetchedMatch.player_2.hp;
          }

          setMatch(fetchedMatch);
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
                next.winner_id = newLog.actor_id;
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
