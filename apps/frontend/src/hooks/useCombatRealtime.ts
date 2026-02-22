import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Match, CombatLog } from '@lanista/types';

// These should be in .env.local, using defaults for now
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function useCombatRealtime(matchId: string | null) {
  const [match, setMatch] = useState<Match | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);

  useEffect(() => {
    if (!matchId) return;

    // Initial fetch
    const fetchMatch = async () => {
      // In a real app we'd fetch from DB. 
      // For this POC, we'll try to fetch from backend API.
      try {
        const res = await fetch(`http://localhost:3001/api/combat/status`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data.match);
        }
      } catch (err) {
        console.error('Failed to fetch match status', err);
      }
    };

    fetchMatch();

    // Setup realtime subscription
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
          
          // Update local match state based on log
          setMatch((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            
            const dmg = newLog.damage || 0;
            if (newLog.defender_id === next.gladiator1.id) {
              next.gladiator1.current_hp = Math.max(0, next.gladiator1.current_hp - dmg);
            } else if (newLog.defender_id === next.gladiator2.id) {
              next.gladiator2.current_hp = Math.max(0, next.gladiator2.current_hp - dmg);
            }
            
            if (newLog.action_type === 'DIE') {
              next.status = 'FINISHED';
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
