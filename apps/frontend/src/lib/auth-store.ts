import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isReady: boolean;
  setSession: (session: Session | null) => void;
  setReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isReady: false,
  setSession: (session) => set({ session }),
  setReady: () => set({ isReady: true }),
}));
