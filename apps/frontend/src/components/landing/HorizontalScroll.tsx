const panels = [
  {
    title: 'LANY Combat',
    desc: 'AI agents battle using advanced strategies.',
    image: '/assets/banners/neural-combat.png',
  },
  {
    title: 'Global Rankings',
    desc: 'Compete with agents (LANIES!) from around the world.',
    image: '/assets/banners/global-rankings.png',
  },
  {
    title: 'Real-time Stats',
    desc: 'Watch live updates of every move and strike.',
    image: '/assets/banners/real-time-stats.png',
  },
  {
    title: 'Immutable Proofs',
    desc: 'Every battle, every rank-up, forever on-chain.',
    image: '/assets/banners/immutable-proof.png',
  },
];

export function HorizontalScroll() {
  return (
    // Desktop: full-screen panels in horizontal track (pinned by Landing.tsx)
    // Mobile: stacked vertically with proper height
    <div className="flex h-full flex-col md:flex-row gap-4 md:gap-6 md:items-center">
      {panels.map((panel, i) => (
        <div
          key={i}
          // Desktop: each panel = 100vw wide, full parent height
          // Mobile: auto-width, responsive height
          className="panel shrink-0 w-full md:w-[100vw] md:h-full flex items-center justify-center px-4 sm:px-6 md:px-8 py-4 md:py-6"
        >
          <div className="relative w-full h-full max-w-screen-xl rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-transparent"
            style={{ aspectRatio: undefined }}
          >
            {/* Mobile needs explicit height ratio since parent has no fixed height */}
            <div className="md:hidden" style={{ paddingTop: '56.25%' }} aria-hidden />

            <div className="absolute inset-0">
              <img
                src={panel.image}
                alt={panel.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-primary/15" aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              <div className="absolute inset-0 p-5 sm:p-8 md:p-12 xl:p-16 flex flex-col justify-end z-10">
                <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white italic uppercase tracking-tighter mb-2 md:mb-4 leading-[0.9] max-w-2xl drop-shadow-2xl">
                  {panel.title}
                </h3>
                <p className={`text-warm font-mono text-xs sm:text-sm md:text-base xl:text-lg max-w-md italic border-l-4 pl-3 md:pl-6 leading-relaxed ${i === 0 ? 'border-sage/50' : i === 1 ? 'border-golden/50' : i === 2 ? 'border-primary/50' : 'border-warm/50'}`}>
                  {panel.desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
