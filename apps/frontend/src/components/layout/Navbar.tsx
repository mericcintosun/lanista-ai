import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, UserCircle, LogOut, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import gsap from 'gsap';
import { supabase } from '../../lib/supabase';
import { UserAuthModal } from './UserAuthModal';
import { SparkBalance } from '../spark/SparkBalance';
import { SparkStoreModal } from '../spark/SparkStoreModal';
interface NavItem {
  name: string;
  path: string;
  icon?: LucideIcon;
}

interface NavbarProps {
  navH: number;
  scrolled: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  navItems: NavItem[];
  myAgentId?: string | null;
}

export function Navbar({ navH, scrolled, isMobileMenuOpen, setIsMobileMenuOpen, navItems, myAgentId = null }: NavbarProps) {
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSparkStore, setShowSparkStore] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const navRef = useRef<HTMLElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // GSAP: Smooth Navbar Height
  useEffect(() => {
    gsap.to(navRef.current, {
      height: navH,
      duration: 0.4,
      ease: 'power3.out'
    });
  }, [navH]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // GSAP: Hover Underline Logic
  useEffect(() => {
    const activeIdx = navItems.findIndex(item => 
      location.pathname === item.path || (item.path === '/game-arena' && location.pathname.startsWith('/game-arena/'))
    );
    const targetIdx = hoveredIdx !== null ? hoveredIdx : (activeIdx !== -1 ? activeIdx : null);

    if (targetIdx !== null && linksRef.current[targetIdx] && underlineRef.current) {
      const link = linksRef.current[targetIdx];
      const { left, width } = link.getBoundingClientRect();
      const parentLeft = link.closest('.lg\\:flex')?.getBoundingClientRect().left || 0;

      gsap.to(underlineRef.current, {
        left: left - parentLeft,
        width: width,
        opacity: 1,
        duration: 0.35,
        ease: 'power3.out'
      });
    } else if (underlineRef.current) {
      gsap.to(underlineRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
    }
  }, [hoveredIdx, location.pathname, navItems]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center transition-colors duration-500 ${scrolled ? 'bg-background/80 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-transparent border-b border-transparent'} backdrop-blur-xl overflow-visible`}
    >
      <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-10 flex items-center justify-between h-full">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-3 shrink-0"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img
            src="/logo-remove-bg.png"
            alt="Lanista"
            className={`rounded-full border border-white/10 ${scrolled ? 'h-8 w-8' : 'h-10 w-10'}`}
          />
          <span className={`font-mono font-black text-white italic tracking-tighter ${scrolled ? 'text-lg' : 'text-xl'}`}>
            lanista
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 relative h-full">
          {/* Animated GSAP Underline */}
          <div 
            ref={underlineRef}
            className="absolute bottom-[20%] h-[2px] bg-primary opacity-0 pointer-events-none rounded-full shadow-[0_0_10px_rgba(223,127,62,0.8)] z-0"
          />

          <div className="flex items-center gap-8 font-mono text-xs uppercase tracking-[0.3em] font-bold">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path || (item.path === '/game-arena' && location.pathname.startsWith('/game-arena/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  ref={el => { linksRef.current[idx] = el; }}
                  onMouseEnter={() => {
                    setHoveredIdx(idx);
                    if (item.path === '/game-arena') prefetchGameHtml();
                  }}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`transition-colors duration-300 py-2 relative z-10 ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          <div className="h-6 w-[1px] bg-white/5 mx-2" />

          <div className="flex items-center gap-3">
            {!session ? (
              <button
                 onClick={() => setShowAuthModal(true)}
                 className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/20 text-primary font-black rounded-lg transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-95 text-xs uppercase tracking-wider italic"
              >
                <UserCircle className="w-3.5 h-3.5" /> Login_
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <SparkBalance session={session} onOpenStore={() => setShowSparkStore(true)} />
                
                {myAgentId && (
                  <Link
                    to={`/agent/${myAgentId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white font-black rounded-lg transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 text-xs uppercase tracking-wider"
                  >
                    <Bot className="w-3.5 h-3.5 text-primary" /> My Lany
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="p-2.5 bg-zinc-900 border border-white/10 text-zinc-400 rounded-lg hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
                  title="Profile Settings"
                >
                  <UserCircle className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2.5 bg-primary/5 border border-primary/10 text-primary/60 rounded-lg hover:bg-primary/20 hover:text-primary transition-all active:scale-90 shadow-[0_0_15px_rgba(223,127,62,0.05)]"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showAuthModal && <UserAuthModal onClose={() => setShowAuthModal(false)} />}
            {showSparkStore && (
              <SparkStoreModal
                onClose={() => setShowSparkStore(false)}
                session={session}
                onPurchased={() => {}}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isMobileMenuOpen ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Menu className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </nav>
  );
}
