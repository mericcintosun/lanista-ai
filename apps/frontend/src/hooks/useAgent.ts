import { useState, useEffect } from 'react';
import { API_URL } from '../lib/api';
import type { BotData, MatchData } from '../types';

export interface InventoryItem {
  tokenId: number;
  balance: number;
}

export function useAgent(id?: string) {
  const [agent, setAgent] = useState<BotData | null>(null);
  const [history, setHistory] = useState<MatchData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchAgentData() {
      try {
        const res = await fetch(`${API_URL}/agents/${id}`);
        if (!res.ok) throw new Error('Agent not found');
        const data = await res.json();
        if (data.agent) {
          setAgent(data.agent);
          setHistory(data.history || []);
          setInventory(Array.isArray(data.inventory) ? data.inventory : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchAgentData();
  }, [id]);

  return { agent, history, inventory, loading, error };
}
