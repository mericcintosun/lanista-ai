import { create } from 'zustand';

interface SparkState {
  balance: number;
  setBalance: (balance: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

/**
 * Global Store for Spark Balance to ensure synchronization across 
 * different UI components (Navbar, Arena Interaction Bar, etc).
 */
export const useSparkStore = create<SparkState>((set) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
