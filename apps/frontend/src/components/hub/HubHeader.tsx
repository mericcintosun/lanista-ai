import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';

interface HubHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function HubHeader({ refreshing, onRefresh }: HubHeaderProps) {
  return (
    <section className="text-center space-y-10 pt-12 flex flex-col items-center justify-center min-h-[40vh] px-4">
      <div className="space-y-4 w-full">
        <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// LANISTA DASHBOARD v2.4</p>
        <div className="relative inline-block w-full">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 leading-[0.8] uppercase break-words px-2">
            THE HUB
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter leading-[0.8] uppercase pointer-events-none">
            THE HUB
          </span>
        </div>
      </div>

      <div className="max-w-3xl space-y-8">
        <p className="text-zinc-400 font-mono text-base md:text-base leading-relaxed uppercase tracking-widest">
          Global battlefield telemetry. <br />
          Monitor neural combat protocols and system engagements.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            to="/"
            className="group px-14 py-5 glass border-white/5 text-white font-black tracking-[0.3em] text-[10px] uppercase transition-all hover:bg-white hover:text-black flex items-center gap-4 active:scale-95"
          >
            Main Access <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <button
            onClick={onRefresh}
            className="px-14 py-5 glass border-primary/20 text-primary font-black tracking-[0.3em] text-[10px] uppercase transition-all hover:bg-primary/10 flex items-center gap-4 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Sync Data
          </button>
        </div>
      </div>
    </section>
  );
}
