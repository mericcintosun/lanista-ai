import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { useLootDropStore } from '../lib/loot-drop-store';
import { RANK_NAMES, tokenIdToName } from '../lib/rankUpItems';

const POLL_INTERVAL_MS = 30_000;
const POLL_LOOKBACK_MS = 10 * 60 * 1000;

type LootDropRow = {
  id: string;
  bot_id: string;
  new_rank_index: number;
  item_id: number;
  fulfilled_at: string;
};

async function pushLootDrop(
  push: (n: { id: string; botId: string; botName: string; rankName: string; itemName: string; itemId: number; timestamp: number }) => void,
  row: LootDropRow
) {
  const { bot_id: botId, new_rank_index: rankIndex, item_id: itemId } = row;
  const rankName = RANK_NAMES[rankIndex] ?? 'IRON';
  const itemName = tokenIdToName(itemId);

  let botName = 'A Lany';
  try {
    const res = await fetch(`${API_URL}/agents/${botId}`);
    if (res.ok) {
      const data = await res.json();
      botName = data.agent?.name ?? botName;
    }
  } catch {
    // keep default
  }

  push({
    id: `${botId}-${itemId}-${Date.now()}`,
    botId,
    botName,
    rankName,
    itemName,
    itemId,
    timestamp: Date.now(),
  });
}

/** Dev: push a fake loot drop to test the banner. Call from console: window.__testLootDrop?.() */
export function pushTestLootDrop() {
  const push = useLootDropStore.getState().push;
  push({
    id: `test-${Date.now()}`,
    botId: '00000000-0000-0000-0000-000000000000',
    botName: 'TestBot',
    rankName: 'BRONZE',
    itemName: "Victor's Morsel",
    itemId: 7,
    timestamp: Date.now(),
  });
}

export function useLootDropNotifications() {
  const push = useLootDropStore((s) => s.push);
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __testLootDrop?: () => void }).__testLootDrop = pushTestLootDrop;
      return () => {
        delete (window as unknown as { __testLootDrop?: () => void }).__testLootDrop;
      };
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('loot-drop-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rank_up_loot_requests',
        },
        async (payload) => {
          const row = payload.new as {
            id?: string;
            bot_id?: string;
            new_rank_index?: number;
            item_id?: number | null;
            fulfilled_at?: string | null;
          };
          if (!row?.fulfilled_at || !row?.item_id || row.item_id < 1) return;
          const dedupeKey = row.id ?? `${row.bot_id}-${row.item_id}-${row.fulfilled_at}`;
          if (shownIds.current.has(dedupeKey)) return;

          shownIds.current.add(dedupeKey);
          await pushLootDrop(push, {
            id: dedupeKey,
            bot_id: row.bot_id ?? '',
            new_rank_index: row.new_rank_index ?? 0,
            item_id: row.item_id,
            fulfilled_at: row.fulfilled_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [push]);

  useEffect(() => {
    const poll = async () => {
      try {
        const since = Date.now() - POLL_LOOKBACK_MS;
        const res = await fetch(`${API_URL}/oracle/recent-loot-drops?since=${since}`);
        if (!res.ok) return;
        const { drops } = (await res.json()) as { drops: LootDropRow[] };
        for (const row of drops ?? []) {
          if (shownIds.current.has(row.id)) continue;
          shownIds.current.add(row.id);
          await pushLootDrop(push, row);
        }
      } catch {
        // ignore
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    if (typeof window !== 'undefined') {
      (window as unknown as { __refreshLootDrops?: () => void }).__refreshLootDrops = poll;
    }

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __refreshLootDrops?: () => void }).__refreshLootDrops;
      }
    };
  }, [push]);
}
