import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from './ParticleBackground';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { getLenis } from '../lib/smoothScroll';

// Sub-components
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { AuthModal } from './layout/AuthModal';
import { MobileMenu } from './layout/MobileMenu';

// ─── NAV HEIGHT CONSTANTS ────────────────────────────────────────────────────
const NAV_H_LARGE = 80; // px — default
const NAV_H_SMALL = 56; // px — after scroll

export function Layout() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        fetch(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json())
          .then((data) => {
            const first = data?.profile?.agents?.[0];
            setMyAgentId(first?.id ?? null);
          })
          .catch(() => setMyAgentId(null));
      } else setMyAgentId(null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) {
        fetch(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json())
          .then((data) => {
            const first = data?.profile?.agents?.[0];
            setMyAgentId(first?.id ?? null);
          })
          .catch(() => setMyAgentId(null));
      } else setMyAgentId(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close mobile menu on route change - handled during render to avoid cascading renders
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }

  // Dynamic navbar height on scroll
  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Scroll to top on route change (Lenis controls scroll, so use its API)
  useEffect(() => {
    const scrollToTop = () => {
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    };
    scrollToTop();
    const id = setTimeout(scrollToTop, 100);
    return () => clearTimeout(id);
  }, [location.pathname]);

  const navH = scrolled ? NAV_H_SMALL : NAV_H_LARGE;

  const navItems = [
    { name: 'The Hub', path: '/hub' },
    { name: 'The Arena', path: '/game-arena', icon: Gamepad2 },
    { name: 'Hall of Fame', path: '/hall-of-fame' },
    { name: 'The Oracle', path: '/oracle' },
  ];

  return (
    <div className="min-h-screen bg-background text-zinc-300 selection:bg-primary/30 relative overflow-x-hidden">
      {/* ── BACKGROUND LAYERS ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute inset-0 mesh-gradient opacity-40" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-golden/8 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-sage/6 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/3 left-0 w-[350px] h-[350px] bg-warm/5 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="fixed inset-0 z-[1]">
        <ParticleBackground />
      </div>

      {/* ── NAVBAR ── */}
      <Navbar 
        navH={navH} 
        scrolled={scrolled} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        navItems={navItems}
        myAgentId={myAgentId}
      />

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu 
            navH={navH} 
            setIsMobileMenuOpen={setIsMobileMenuOpen} 
            navItems={navItems}
            myAgentId={myAgentId}
          />
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <motion.main
        animate={{ paddingTop: navH }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="relative z-20 flex flex-col items-center w-full min-h-screen"
      >
        <div className={`w-full ${location.pathname === '/' ? 'max-w-none px-0' : 'max-w-[1400px] px-4 sm:px-6 md:px-10'}`}>
          <Outlet context={{ openAuth: () => setShowAuthModal(true) }} />
        </div>
      </motion.main>

      {/* ── FOOTER ── */}
      <Footer navItems={navItems} />

      <AnimatePresence>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
