import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserCircle, Bot, LogOut, Flame, Shield, Swords, LayoutGrid, Terminal } from 'lucide-react';
import gsap from 'gsap';
import { supabase } from '../../lib/supabase';
import { SparkBalance } from '../spark/SparkBalance';

interface NavItem {
  name: string;
  path: string;
}

interface MobileMenuProps {
  navH: number;
  setIsMobileMenuOpen: (open: boolean) => void;
  navItems: NavItem[];
  myAgentId?: string | null;
}

export function MobileMenu({ navH, setIsMobileMenuOpen, navItems, myAgentId = null }: MobileMenuProps) {
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuRef.current) return;

    // Entrance animation
    gsap.fromTo(menuRef.current, 
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    );

    // Staggered items entrance
    gsap.fromTo(itemsRef.current.filter(Boolean),
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.05, ease: 'back.out(1.7)', delay: 0.1 }
    );
  }, []);

  const handleSignOut = async () => {
    try {
      setIsMobileMenuOpen(false);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ top: navH }}
      className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[60] overflow-y-auto pb-12"
    >
      <div className="flex flex-col gap-8 py-10 px-8">
        
        {/* Account Header Section */}
        {session && (
          <div ref={el => itemsRef.current[0] = el} className="space-y-4">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest pl-2">Account Control</p>
            <div className="grid grid-cols-1 gap-2">
               <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold"
              >
                <div className="p-2 bg-primary/20 rounded-lg">
                  <UserCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm uppercase tracking-wider font-black italic">User Profile</span>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Settings & Identity</span>
                </div>
              </Link>

              {myAgentId && (
                <Link
                  to={`/agent/${myAgentId}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold"
                >
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm uppercase tracking-wider font-black italic">My Lany</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Autonomous Agent</span>
                  </div>
                </Link>
              )}
            </div>
            
            <div className="py-2 px-2">
               <SparkBalance session={session} onOpenStore={() => {}} />
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <div className="space-y-4">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest pl-2">Protocols</p>
          <div className="grid grid-cols-1 gap-2">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path || (item.path === '/game-arena' && location.pathname.startsWith('/game-arena/'));
              return (
                <div key={item.path} ref={el => itemsRef.current[idx + 5] = el}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${isActive 
                      ? 'bg-primary/10 border-primary/30 text-white' 
                      : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white'}`}
                  >
                    <span className="text-sm font-black uppercase italic tracking-wider font-mono">{item.name}</span>
                    <Terminal className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-zinc-700'}`} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auth Actions */}
        <div className="pt-4 border-t border-white/5" ref={el => itemsRef.current[20] = el}>
          {session ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-3 w-full p-5 rounded-2xl bg-primary/5 border border-primary/10 text-primary font-black uppercase tracking-widest italic text-sm"
            >
              <LogOut className="w-5 h-5" /> Terminate Session
            </button>
          ) : (
            <button
              onClick={() => { setIsMobileMenuOpen(false); /* logic for opening auth modal should be here if needed */ }}
              className="flex items-center justify-center gap-3 w-full p-5 rounded-2xl bg-primary border border-primary text-white font-black uppercase tracking-widest italic text-sm"
            >
              <UserCircle className="w-5 h-5" /> Access Terminal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
