export function OracleHeader() {
  return (
    <section className="text-center space-y-8 pt-12 px-4 flex flex-col items-center justify-center min-h-[30vh]">
      <div className="space-y-4 w-full">
        <div className="relative inline-block w-full max-w-4xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.9] break-words px-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            THE ORACLE
          </h1>
          <span className="absolute inset-0 z-0 translate-x-[3px] translate-y-[3px] text-red-500/20 blur-[2px] italic font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter uppercase leading-[0.9] pointer-events-none">
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
