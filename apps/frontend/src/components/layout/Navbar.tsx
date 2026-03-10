import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, UserCircle, LogOut, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import gsap from 'gsap';
import { supabase } from '../../lib/supabase';
import { NAV_ANIM_DURATION } from '../../hooks/useScrollState';
import { SparkBalance } from '../spark/SparkBalance';
import { BuySparkDrawer } from '../spark/BuySparkDrawer';
import { useAuthStore } from '../../lib/auth-store';
import { useUserStore } from '../../lib/user-store';
import { useUIStore } from '../../lib/ui-store';

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
}

export function Navbar({ navH, scrolled, isMobileMenuOpen, setIsMobileMenuOpen, navItems }: NavbarProps) {
  const location = useLocation();
  const session = useAuthStore((s) => s.session);
  const myAgentId = useUserStore((s) => s.myAgentId);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const [showSparkDrawer, setShowSparkDrawer] = useState(false);
  
  const navRef = useRef<HTMLElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // GSAP: Smooth Navbar Height (synced with Layout padding)
  useEffect(() => {
    if (!navRef.current) return;
    gsap.to(navRef.current, {
      height: navH,
      duration: NAV_ANIM_DURATION,
      ease: 'power3.out',
      overwrite: true,
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
      className={`fixed top-0 left-0 right-0 z-50 flex items-center transition-[background-color,border-color,box-shadow] duration-300 ease-out ${scrolled ? 'bg-background/80 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-transparent border-b border-transparent shadow-none'} backdrop-blur-xl overflow-visible`}
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
            className={`rounded-full border border-white/10 transition-[width,height] duration-300 ease-out ${scrolled ? 'h-8 w-8' : 'h-10 w-10'}`}
          />
          <span className={`font-mono font-black text-white italic tracking-tighter transition-[font-size] duration-300 ease-out ${scrolled ? 'text-lg' : 'text-xl'}`}>
            Lanista
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
            {!session && (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/20 text-primary font-black rounded-lg transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-95 text-xs uppercase tracking-wider italic"
              >
                <UserCircle className="w-3.5 h-3.5" /> Login_
              </button>
            )}
            <div className={session ? '' : 'hidden'}>
              <SparkBalance onOpenStore={() => setShowSparkDrawer(true)} />
            </div>
            {session && (
              <>
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
              </>
            )}
          </div>

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

      <BuySparkDrawer
        open={showSparkDrawer}
        onClose={() => setShowSparkDrawer(false)}
        session={session}
      />
    </nav>
  );
}
