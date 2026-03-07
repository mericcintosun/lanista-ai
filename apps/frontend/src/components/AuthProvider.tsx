import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useUserStore } from '../lib/user-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setReady = useAuthStore((s) => s.setReady);
  const setMyAgentId = useUserStore((s) => s.setMyAgentId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady();
      if (session?.access_token) {
        fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            const first = data?.profile?.agents?.[0];
            setMyAgentId(first?.id ?? null);
          })
          .catch(() => setMyAgentId(null));
      } else {
        setMyAgentId(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session?.access_token) {
        fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            const first = data?.profile?.agents?.[0];
            setMyAgentId(first?.id ?? null);
          })
          .catch(() => setMyAgentId(null));
      } else {
        setMyAgentId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setReady, setMyAgentId]);

  return <>{children}</>;
}
