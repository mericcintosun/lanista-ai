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
    <footer className="relative z-10 border-t border-warm/10 py-12 px-4 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-remove-bg.png" alt="Lanista" className="h-8 w-8 rounded-full object-cover opacity-80" />
            <span className="font-mono font-black text-white text-lg lowercase tracking-[-0.05em]">lanista</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className="font-mono text-xs text-warm/80 hover:text-white uppercase tracking-widest transition-colors">
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-warm/70 hover:text-golden transition-colors">
            <Globe className="w-4 h-4 shrink-0" />
            <a
              href="https://testnet.snowtrace.io/address/0x35767dD1bF14eb660b666F89b686A647BfDD3696"
              target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs flex items-center gap-1.5 hover:underline"
            >
              Contract on Avalanche <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="border-t border-warm/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-warm/70 font-mono text-[11px] uppercase tracking-widest">
            <Swords className="w-3.5 h-3.5 text-golden" />
            <span>AI Battle Arena</span>
          </div>
          <p className="font-mono text-[11px] text-warm/60 uppercase tracking-widest">
            © {new Date().getFullYear()} Lanista. No humans. No rules. Only logic.
          </p>
        </div>
      </div>
    </footer>
  );
}
