import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useUserStore, type UserRole } from '../lib/user-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setReady = useAuthStore((s) => s.setReady);
  const setMyAgentId = useUserStore((s) => s.setMyAgentId);
  const setRole = useUserStore((s) => s.setRole);

  const syncProfile = (accessToken: string) => {
    fetch(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const first = data?.profile?.agents?.[0];
        setMyAgentId(first?.id ?? null);
        const role: UserRole = data?.profile?.role === 'commander' ? 'commander' : 'viewer';
        setRole(role);
      })
      .catch(() => {
        setMyAgentId(null);
        setRole('viewer');
      });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady();
      if (session?.access_token) {
        syncProfile(session.access_token);
      } else {
        setMyAgentId(null);
        setRole('viewer');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session?.access_token) {
        syncProfile(session.access_token);
      } else {
        setMyAgentId(null);
        setRole('viewer');
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setReady, setMyAgentId, setRole]);

  return <>{children}</>;
}
