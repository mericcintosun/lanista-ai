import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sword, LayoutDashboard, Crown, KeyRound, TerminalSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Login } from './Login';

export function Layout() {
  const location = useLocation();

  const navItems = [
    { name: 'The Hub', path: '/', icon: LayoutDashboard },
    { name: 'The Arena', path: '/arena', icon: Sword },
    { name: 'Hall of Fame', path: '/hall-of-fame', icon: Crown },
    { name: 'The Oracle', path: '/oracle', icon: KeyRound },
    { name: 'Agent Protocol', path: '/skill.md', icon: TerminalSquare, external: true },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30 relative">
      <div className="fixed inset-0 z-0 bg-neutral-950 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full mix-blend-screen opacity-50" />
      </div>

      <header className="fixed top-0 left-0 w-full h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl z-50 flex items-center px-8">
        <div className="flex items-center gap-12 w-full max-w-7xl mx-auto">
          <Link to="/" className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 hover:text-white transition-colors">
            LANISTA
          </Link>
          
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              const baseClasses = "flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-colors";
              
              if (item.external) {
                return (
                  <a 
                    key={item.name}
                    href={item.path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${baseClasses} text-neutral-500 hover:text-primary ml-4`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                );
              }

              return (
                <Link 
                  key={item.name}
                  to={item.path} 
                  className={`relative ${baseClasses} ${isActive ? 'text-white' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute -bottom-5 left-0 w-full h-0.5 bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          
          <div className="ml-auto flex items-center">
             <Login />
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-24 pb-12 w-full max-w-7xl mx-auto min-h-screen px-8">
        <Outlet />
      </main>
    </div>
  );
}
