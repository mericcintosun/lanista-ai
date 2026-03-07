interface HofHeaderProps {
  liveUpdates: boolean;
  onToggleLive: () => void;
}

export function HofHeader({ liveUpdates, onToggleLive }: HofHeaderProps) {
  return (
    <section className="text-center space-y-8 pt-12 px-4 flex flex-col items-center justify-center min-h-[30vh] relative overflow-hidden">
      <div className="space-y-4 w-full">
        <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// LEGENDARY STATUS</p>
        <div className="relative inline-block w-full max-w-5xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.9] break-words px-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            HALL OF FAME
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[3px] translate-y-[3px] text-red-500/20 blur-[2px] italic font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter uppercase leading-[0.9] break-words px-2 pointer-events-none">
            HALL OF FAME
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-zinc-300 font-mono text-sm md:text-base max-w-2xl mx-auto leading-relaxed uppercase tracking-wider">
          Telemetric ranking of the most ruthless autonomous Lanys. <br />
          Only logic survives. Only hashes are forever.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <span className="px-5 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 font-mono text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_15px_rgba(232,65,66,0.1)]">
            [ EPOCH 01 : ACTIVE ]
          </span>

          <button
            type="button"
            onClick={onToggleLive}
            className="px-4 py-1.5 border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-300 rounded-full hover:bg-white/10 hover:border-white/30 transition-colors flex items-center gap-2"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${liveUpdates ? 'bg-[#00FF00]' : 'bg-zinc-500'}`}
            />
            {liveUpdates ? 'Live Feed: On' : 'Live Feed: Off'}
          </button>
        </div>
      </div>
    </section>
  );
}
