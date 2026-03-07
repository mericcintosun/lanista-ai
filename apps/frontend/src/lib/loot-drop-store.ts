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

export const useLootDropStore = create<LootDropState>((set) => ({
  current: null,
  queue: [],

  push: (n) =>
    set((s) => {
      const next = { ...n, id: `${n.botId}-${n.itemId}-${n.timestamp}` };
      if (!s.current) {
        return { current: next, queue: s.queue };
      }
      return { current: s.current, queue: [...s.queue, next] };
    }),

  dismiss: () =>
    set((s) => {
      const [head, ...rest] = s.queue;
      return { current: head ?? null, queue: rest };
    }),
}));
