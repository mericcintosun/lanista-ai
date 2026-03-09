import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from './ParticleBackground';
import { getLenis } from '../lib/lenis-instance';
import { useUIStore } from '../lib/ui-store';

// Sub-components
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { UserAuthModal } from './layout/UserAuthModal';
import { MobileMenu } from './layout/MobileMenu';
import { LootDropBanner } from './notifications/LootDropBanner';
import { useLootDropNotifications } from '../hooks/useLootDropNotifications';
import { FeedbackPopup } from './common/FeedbackPopup';

// ─── NAV HEIGHT CONSTANTS ────────────────────────────────────────────────────
const NAV_H_LARGE = 80; // px — default
const NAV_H_SMALL = 56; // px — after scroll

export function Layout() {
  const showAuthModal = useUIStore((s) => s.showAuthModal);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);

  useLootDropNotifications();
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

  const footerItems = [
    ...navItems,
    { name: 'Spark Guide', path: '/spark' },
  ];

  return (
    <div className="min-h-screen bg-background text-zinc-300 selection:bg-primary/30 relative overflow-x-hidden">
      {/* ── BACKGROUND: particles ── */}
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
      <Footer navItems={footerItems} />

      <AnimatePresence>
        {showAuthModal && <UserAuthModal onClose={closeAuthModal} />}
      </AnimatePresence>

      <LootDropBanner />

      {/* ── FEEDBACK POPUP ── */}
      <FeedbackPopup />

      {/* ── GLOBAL FEEDBACK BUTTON ── */}
      <a
        href="https://forms.gle/HkhSb6SsZ53SK1FJ9"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[90] w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 hover:shadow-primary/20 transition-all border border-white/20"
        title="Provide Feedback"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
           <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </a>
    </div>
  );
}
