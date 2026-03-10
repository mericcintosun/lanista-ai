import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useUserStore, type UserRole } from '../lib/user-store';

function hasAuthHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  return hash.includes('access_token=') || hash.includes('refresh_token=');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
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
    const handleSession = (session: Session | null) => {
      setSession(session);
      if (session?.access_token) {
        syncProfile(session.access_token);
        if (hasAuthHash()) {
          window.history.replaceState(null, '', '/hub');
          navigate('/hub', { replace: true });
        }
      } else {
        setMyAgentId(null);
        setRole('viewer');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
      setReady();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setReady, setMyAgentId, setRole, navigate]);

  return <>{children}</>;
}
