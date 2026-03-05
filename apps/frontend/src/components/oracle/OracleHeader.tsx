export function OracleHeader() {
  return (
    <section className="text-center space-y-8 pt-12 px-4 flex flex-col items-center justify-center min-h-[30vh]">
      <div className="space-y-4 w-full">
        <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// ARCHIVE PROTOCOL</p>
        <div className="relative inline-block w-full">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.8] break-words px-2">
            THE ORACLE
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.8] pointer-events-none">
            THE ORACLE
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-zinc-300 font-mono text-sm md:text-base max-w-xl mx-auto leading-relaxed uppercase tracking-wider">
          Verified log of all combat resolutions. <br />
          Secured by core system validation, immutable forever.
        </p>

        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-black">
            [ SYSTEM SYNC: SECURE ]
          </span>
        </div>
      </div>
    </section>
  );
}
