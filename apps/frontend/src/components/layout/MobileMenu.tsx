import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { UserCircle, Bot, LogOut, Terminal } from 'lucide-react';
import gsap from 'gsap';
import { supabase } from '../../lib/supabase';
import { SparkBalance } from '../spark/SparkBalance';
import { useAuthStore } from '../../lib/auth-store';
import { useUserStore } from '../../lib/user-store';
import { useUIStore } from '../../lib/ui-store';

interface NavItem {
  name: string;
  path: string;
}

interface MobileMenuProps {
  navH: number;
  setIsMobileMenuOpen: (open: boolean) => void;
  navItems: NavItem[];
}

export function MobileMenu({ navH, setIsMobileMenuOpen, navItems }: MobileMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const myAgentId = useUserStore((s) => s.myAgentId);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

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
      className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[60] overflow-y-auto pb-8"
    >
      <div className="flex flex-col gap-4 py-5 px-5">

        {/* Account */}
        {session && (
          <div ref={el => { itemsRef.current[0] = el; }} className="space-y-2">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest px-1">Account</p>
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white"
            >
              <div className="p-1.5 bg-primary/20 rounded-lg shrink-0">
                <UserCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">User Profile</p>
                <p className="text-[9px] font-mono text-zinc-500 uppercase">Settings & Identity</p>
              </div>
            </Link>

            {myAgentId && (
              <Link
                to={`/agent/${myAgentId}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white"
              >
                <div className="p-1.5 bg-emerald-500/20 rounded-lg shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">My Lany</p>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase">Autonomous Agent</p>
                </div>
              </Link>
            )}

            <div className="px-1">
              <SparkBalance onOpenStore={() => { setIsMobileMenuOpen(false); navigate('/buy-sparks'); }} />
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest px-1">Menu</p>
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.path || (item.path === '/game-arena' && location.pathname.startsWith('/game-arena/'));
            return (
              <div key={item.path} ref={el => { itemsRef.current[idx + 5] = el; }}>
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  onMouseEnter={() => item.path === '/game-arena' && prefetchGameHtml()}
                  onTouchStart={() => item.path === '/game-arena' && prefetchGameHtml()}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    isActive ? 'bg-primary/10 border-primary/25 text-white' : 'bg-white/[0.02] border-white/5 text-zinc-400'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider font-mono">{item.name}</span>
                  <Terminal className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-zinc-700'}`} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Auth */}
        <div className="pt-2 border-t border-white/5" ref={el => { itemsRef.current[20] = el; }}>
          {session ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 text-primary font-black uppercase tracking-widest text-xs"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          ) : (
            <button
              onClick={() => { setIsMobileMenuOpen(false); openAuthModal(); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary border border-primary text-white font-black uppercase tracking-widest text-xs"
            >
              <UserCircle className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
