import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gamepad2, MessageCircle } from 'lucide-react';
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

      {/* ── FIXED FEEDBACK BUTTON ── */}
      <a
        href="https://forms.gle/HkhSb6SsZ53SK1FJ9"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] flex items-center justify-center w-12 h-12 rounded-full bg-warm/15 border border-warm/30 text-warm shadow-[0_0_20px_rgba(223,127,62,0.2)] hover:bg-warm/25 hover:border-warm/50 hover:shadow-[0_0_24px_rgba(223,127,62,0.35)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Geri bildirim formu / Feedback form"
      >
        <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
      </a>
    </div>
  );
}
