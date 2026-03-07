import { create } from 'zustand';

interface UserState {
  myAgentId: string | null;
  setMyAgentId: (id: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  myAgentId: null,
  setMyAgentId: (myAgentId) => set({ myAgentId }),
}));
