import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from './ParticleBackground';

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
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);

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
        <div className="absolute inset-0 noise" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <ParticleBackground />

      {/* ── UNITY PRELOADER (silent background cache warmer) ── */}
      <iframe
        src="/lanista-build/game.html"
        title=""
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 2,
          height: 2,
          opacity: 0,
          pointerEvents: 'none',
          border: 'none',
          zIndex: -999,
        }}
      />

      {/* ── NAVBAR ── */}
      <Navbar 
        navH={navH} 
        scrolled={scrolled} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        navItems={navItems} 
      />

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu 
            navH={navH} 
            setIsMobileMenuOpen={setIsMobileMenuOpen} 
            navItems={navItems} 
          />
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <motion.main
        animate={{ paddingTop: navH }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="relative z-10 flex flex-col items-center w-full min-h-screen"
      >
        <div className="w-full max-w-[1400px] px-4 sm:px-6 md:px-10">
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
