import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export const Login = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) console.error("Login error:", error.message);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);
  };

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
           {session.user.user_metadata.avatar_url && (
             <img src={session.user.user_metadata.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full" />
           )}
           <span className="truncate max-w-[120px]">{session.user.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white font-bold tracking-widest uppercase text-xs rounded transition-colors hover:bg-neutral-800"
        >
          <LogOut className="w-3 h-3" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGoogleLogin}
      className="flex items-center gap-2 px-6 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white font-bold tracking-widest uppercase text-xs rounded transition-colors"
    >
      <LogIn className="w-4 h-4" />
      Login with Google
    </button>
  );
};
