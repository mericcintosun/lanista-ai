import { create } from 'zustand';

export type UserRole = 'viewer' | 'commander';

interface UserState {
  myAgentId: string | null;
  role: UserRole;
  setMyAgentId: (id: string | null) => void;
  setRole: (role: UserRole) => void;
}

export const useUserStore = create<UserState>((set) => ({
  myAgentId: null,
  role: 'viewer',
  setMyAgentId: (myAgentId) => set({ myAgentId }),
  setRole: (role) => set({ role }),
}));
