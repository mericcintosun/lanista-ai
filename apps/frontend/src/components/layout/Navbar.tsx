import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

  return (
    <motion.nav
      animate={{ height: navH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center bg-background/60 backdrop-blur-md border-b border-white/5 overflow-visible"
    >
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-3 group"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="relative shrink-0">
            <img
              src="/logo-remove-bg.png"
              alt="LANISTA"
              className={`transition-all duration-300 rounded-full aspect-square object-cover border-2 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] p-1 group-hover:border-white/60 group-hover:scale-105 ${scrolled ? 'h-8 w-8' : 'h-11 w-11'}`}
            />
          </div>
          <span className={`font-mono font-black text-white lowercase transition-all duration-300 tracking-[-0.05em] group-hover:text-primary leading-none ${scrolled ? 'text-lg' : 'text-xl'}`}>
            lanista
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-10 font-mono text-xs uppercase tracking-[0.35em]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/game-arena' && location.pathname.startsWith('/game-arena/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`transition-all duration-300 hover:text-white relative group ${isActive ? 'text-white font-bold' : 'text-zinc-500'}`}
              >
                {item.name}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-primary shadow-[0_0_8px_rgba(255,45,45,0.8)] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isMobileMenuOpen ? (
              <motion.span key="x" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.nav>
  );
}
