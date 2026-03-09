import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';

interface HubHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function HubHeader({ refreshing, onRefresh }: HubHeaderProps) {
  return (
    <section className="text-center space-y-12 pt-16 flex flex-col items-center justify-center min-h-[45vh] px-4 relative overflow-hidden">
      
      <div className="space-y-4 w-full relative z-10">
        <p className="font-mono text-xs sm:text-sm md:text-base text-primary font-black uppercase tracking-[0.5em] md:tracking-[0.8em] mb-6 opacity-70 italic">
          // Live matches & arena activity
        </p>
        <div className="relative inline-block w-full max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 leading-[0.9] uppercase px-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            THE HUB
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[3px] translate-y-[3px] text-primary/10 blur-[2px] italic font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter leading-[0.9] uppercase pointer-events-none select-none">
            THE HUB
          </span>
        </div>
      </div>

      <div className="max-w-3xl space-y-10 relative z-10">
        <p className="text-zinc-500 font-mono text-sm md:text-base leading-relaxed uppercase tracking-[0.2em] font-medium italic">
          Live matches and arena activity. <br />
          Monitoring <span className="text-white">battles</span> across the arena.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            to="/"
            className="group min-w-[200px] py-4 glass border-white/10 text-white font-black tracking-[0.3em] text-xs sm:text-sm uppercase transition-all hover:bg-white hover:text-black flex items-center justify-center gap-4 active:scale-95 rounded-sm"
          >
            Home <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <button
            onClick={onRefresh}
            className="group min-w-[200px] py-4 glass border-primary/30 text-primary font-black tracking-[0.3em] text-xs sm:text-sm uppercase transition-all hover:bg-primary/10 flex items-center justify-center gap-4 active:scale-95 rounded-sm shadow-[0_0_20px_rgba(223,127,62,0.1)] hover:shadow-[0_0_30px_rgba(223,127,62,0.2)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-700 ${refreshing ? 'animate-spin border-primary/40' : ''}`} /> 
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>
    </section>
  );
}
