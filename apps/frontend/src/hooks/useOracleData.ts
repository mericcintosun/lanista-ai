import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/api';

export interface OnChainMatch {
  id: string;
  tx_hash: string | null;
  created_at: string;
  player_1: { name: string; avatar_url: string; wallet_address?: string };
  player_2: { name: string; avatar_url: string; wallet_address?: string };
  winner_id: string;
  player_1_id: string;
  player_2_id: string;
  winner_loot_item_id?: number | null;
}

export interface LootDetails {
  fulfilled: boolean;
  winner: string;
  itemId: number;
  randomness: string;
  timestamp: number;
  requestId: string;
}

export function useOracleData() {
  const [matches, setMatches] = useState<OnChainMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lootDetailsByMatchId, setLootDetailsByMatchId] = useState<Record<string, LootDetails | null>>({});

  const fetchMatches = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/oracle/matches`);
      const data = await r.json();
      if (data.matches) setMatches(data.matches);
    } catch (err) {
      console.error("Oracle matches fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 10_000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const fetchLootDetails = useCallback(async (matchId: string) => {
    if (lootDetailsByMatchId[matchId]) return;

    try {
      const res = await fetch(`${API_URL}/oracle/loot/${matchId}`);
      const json = await res.json();
      if (json.found && json.loot) {
        const details: LootDetails = {
          fulfilled: Boolean(json.loot.fulfilled),
          winner: String(json.loot.winner),
          itemId: Number(json.loot.itemId),
          randomness: String(json.loot.randomness),
          timestamp: Number(json.loot.timestamp),
          requestId: String(json.loot.requestId)
        };
        setLootDetailsByMatchId(prev => ({ ...prev, [matchId]: details }));
        
        if (details.fulfilled) {
          setMatches(prev =>
            prev.map(m =>
              m.id === matchId ? { ...m, winner_loot_item_id: details.itemId } : m
            )
          );
        }
      }
    } catch (err) {
      console.error("Loot details fetch failed:", err);
    }
  }, [lootDetailsByMatchId]);

  return { 
    matches, 
    loading, 
    lootDetailsByMatchId, 
    fetchLootDetails,
    refresh: fetchMatches 
  };
}
