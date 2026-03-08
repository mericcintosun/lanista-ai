interface BattleArenaHeaderProps {
  title?: string;
  subtitle?: string;
}

export function BattleArenaHeader({ 
  title = "LIVE ARENA", 
  subtitle = "// LIVE" 
}: BattleArenaHeaderProps) {
  return (
    <section className="text-center py-16 space-y-8 flex flex-col items-center justify-center min-h-[30vh] px-4">
      <div className="space-y-4 w-full">
        <p className="font-mono text-[10px] md:text-xs text-primary font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">
          {subtitle}
        </p>
        <div className="relative inline-block w-full max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.9] break-words px-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            {title}
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[3px] translate-y-[3px] text-primary/20 blur-[2px] italic font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter uppercase leading-[0.9] pointer-events-none">
            {title}
          </span>
        </div>
      </div>
    </section>
  );
}
