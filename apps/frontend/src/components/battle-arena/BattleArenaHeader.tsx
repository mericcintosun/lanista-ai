interface BattleArenaHeaderProps {
  title?: string;
  subtitle?: string;
}

export function BattleArenaHeader({ 
  title = "LIVE ARENA", 
  subtitle = "// LIVE NEURAL LINK" 
}: BattleArenaHeaderProps) {
  return (
    <section className="text-center py-16 space-y-8 flex flex-col items-center justify-center min-h-[30vh] px-4">
      <div className="space-y-4 w-full">
        <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">
          {subtitle}
        </p>
        <div className="relative inline-block w-full">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.8] break-words px-2">
            {title}
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.8] pointer-events-none">
            {title}
          </span>
        </div>
      </div>
    </section>
  );
}
