import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from './ParticleBackground';
import { getLenis } from '../lib/smoothScroll';
import { useUIStore } from '../lib/ui-store';

// Sub-components
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { AuthModal } from './layout/AuthModal';
import { MobileMenu } from './layout/MobileMenu';

// ─── NAV HEIGHT CONSTANTS ────────────────────────────────────────────────────
const NAV_H_LARGE = 80; // px — default
const NAV_H_SMALL = 56; // px — after scroll

export function Layout() {
  const { showAuthModal, closeAuthModal } = useUIStore();
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
      {/* ── BACKGROUND: grid pattern + particles ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: location.pathname.startsWith('/agent')
              ? 'linear-gradient(to right, rgba(127,29,29,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(127,29,29,0.08) 1px, transparent 1px)'
              : location.pathname.startsWith('/oracle')
                ? 'linear-gradient(to right, rgba(12,165,90,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(12,165,90,0.1) 1px, transparent 1px)'
                : location.pathname.startsWith('/hall-of-fame')
                ? 'linear-gradient(to right, rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.1) 1px, transparent 1px)'
                : location.pathname.startsWith('/game-arena')
                  ? 'linear-gradient(to right, rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.06) 1px, transparent 1px)'
                  : location.pathname === '/hub'
                    ? 'linear-gradient(to right, rgba(180,214,111,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(180,214,111,0.06) 1px, transparent 1px)'
                    : 'linear-gradient(to right, rgba(223,127,62,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(223,127,62,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
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
        className="relative z-20 flex flex-col items-center w-full min-h-screen"
      >
        <div className={`w-full ${location.pathname === '/' ? 'max-w-none px-0' : 'max-w-[1400px] px-4 sm:px-6 md:px-10'}`}>
          <Outlet />
        </div>
      </motion.main>

      {/* ── FOOTER ── */}
      <Footer navItems={navItems} />

      <AnimatePresence>
        {showAuthModal && <AuthModal onClose={closeAuthModal} />}
      </AnimatePresence>
    </div>
  );
}
