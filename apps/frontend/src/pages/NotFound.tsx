import { Link } from 'react-router-dom';
import { Home, Swords } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg mx-auto space-y-8">
        <div className="relative">
          <span className="font-mono text-[120px] sm:text-[160px] font-black italic text-primary/20 leading-none select-none">
            404
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter">
            Page Not Found
          </h1>
          <p className="font-mono text-sm text-zinc-400 uppercase tracking-wider leading-relaxed">
            This page doesn&apos;t exist. Return home or try the Hub.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 bg-primary border border-primary/30 text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 hover:border-primary transition-all"
          >
            <Home className="w-4 h-4" />
            Return to Base
          </Link>
          <Link
            to="/hub"
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-zinc-300 font-mono text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <Swords className="w-4 h-4" />
            The Hub
          </Link>
        </div>

        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest pt-4">
          404
        </p>
      </div>
    </div>
  );
}
