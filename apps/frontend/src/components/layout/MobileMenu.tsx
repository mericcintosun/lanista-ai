import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

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

  return (
    <motion.div
      key="mobile-menu"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ top: navH }}
      className="fixed inset-x-0 bottom-0 bg-black/95 backdrop-blur-2xl z-[60] border-t border-white/5 overflow-y-auto"
    >
      <div className="flex flex-col items-center justify-center min-h-full gap-4 py-12 px-6">
        {myAgentId && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0 }}
            className="w-full max-w-xs"
          >
            <Link
              to={`/agent/${myAgentId}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-center py-5 px-6 rounded-xl font-mono text-base font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <Bot className="w-4 h-4" /> My Agent
              </span>
            </Link>
          </motion.div>
        )}
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path || (item.path === '/game-arena' && location.pathname.startsWith('/game-arena/'));
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="w-full max-w-xs"
            >
              <Link
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block w-full text-center py-5 px-6 rounded-xl font-mono text-base font-bold uppercase tracking-widest transition-all duration-200 ${isActive
                  ? 'bg-primary/20 text-white border border-primary/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                {item.name}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
