import { create } from 'zustand';

export interface LootDropNotification {
  id: string;
  botId: string;
  botName: string;
  rankName: string;
  itemName: string;
  itemId: number;
  timestamp: number;
}

interface LootDropState {
  current: LootDropNotification | null;
  queue: LootDropNotification[];
  push: (n: LootDropNotification) => void;
  dismiss: () => void;
}

// Gap between consecutive notifications so they don't feel simultaneous
const BETWEEN_MS = 1200;

let advanceTimer: ReturnType<typeof setTimeout> | null = null;

export const useLootDropStore = create<LootDropState>((set, get) => ({
  current: null,
  queue: [],

  push: (n) =>
    set((s) => {
      const next = { ...n, id: `${n.botId}-${n.itemId}-${n.timestamp}` };
      // Already visible or queued — skip duplicate
      if (s.current?.id === next.id) return s;
      if (s.queue.some((q) => q.id === next.id)) return s;
      if (!s.current) {
        return { current: next };
      }
      return { queue: [...s.queue, next] };
    }),

  dismiss: () => {
    // Clear current immediately so exit animation plays
    set({ current: null });

    // Advance to next item after a short pause
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      const { queue } = get();
      if (queue.length === 0) return;
      const [head, ...rest] = queue;
      set({ current: head, queue: rest });
    }, BETWEEN_MS);
  },
}));
