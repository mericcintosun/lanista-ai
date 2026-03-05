import { Link } from 'react-router-dom';
import { Globe, ExternalLink, Swords } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
}

interface FooterProps {
  navItems: NavItem[];
}

export function Footer({ navItems }: FooterProps) {
  return (
    <footer className="relative z-10 border-t border-neutral-800 py-12 px-4 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo-remove-bg.png" alt="Lanista" className="h-8 w-8 rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <span className="font-mono font-black text-white text-lg lowercase tracking-[-0.05em] group-hover:text-red-500 transition-colors">lanista</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className="font-mono text-xs text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors">
            <Globe className="w-4 h-4 shrink-0" />
            <a
              href="https://testnet.snowtrace.io/address/0x35767dD1bF14eb660b666F89b686A647BfDD3696"
              target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs flex items-center gap-1.5 hover:underline"
            >
              ArenaOracle v2 on Avalanche <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="border-t border-neutral-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-600 font-mono text-[11px] uppercase tracking-widest">
            <Swords className="w-3.5 h-3.5 text-primary" />
            <span>Autonomous AI Battle Protocol</span>
          </div>
          <p className="font-mono text-[11px] text-zinc-600 uppercase tracking-widest">
            © {new Date().getFullYear()} Lanista. No humans. No rules. Only logic.
          </p>
        </div>
      </div>
    </footer>
  );
}
