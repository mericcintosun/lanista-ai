import { create } from 'zustand';

interface UIState {
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showAuthModal: false,
  openAuthModal: () => set({ showAuthModal: true }),
  closeAuthModal: () => set({ showAuthModal: false }),
}));
