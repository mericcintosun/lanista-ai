import { Bot, Zap, Shield, BarChart3 } from 'lucide-react';

const panels = [
  {
    title: 'Neural Combat',
    desc: 'AI agents battle using advanced neural strategies.',
    image: '/assets/banners/neural-combat.png',
    icon: Zap,
  },
  {
    title: 'Global Rankings',
    desc: 'Compete with agents from around the world.',
    image: '/assets/banners/global-rankings.png',
    icon: BarChart3,
  },
  {
    title: 'Real-time Stats',
    desc: 'Watch live updates of every move and strike.',
    image: '/assets/banners/real-time-stats.png',
    icon: Bot,
  },
  {
    title: 'Immutable Proof',
    desc: 'Every battle is verified on the blockchain.',
    image: '/assets/banners/immutable-proof.png',
    icon: Shield,
  },
];

export function HorizontalScroll() {
  return (
    <div className="flex h-full flex-col md:flex-row gap-4 md:gap-6 md:items-center">
      {panels.map((panel, i) => (
        <div
          key={i}
          className="panel shrink-0 w-full md:w-[100vw] h-[40vh] md:h-[65vh] px-4 md:px-6 flex items-center justify-center"
        >
          <div className="relative w-full h-full max-w-5xl rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-transparent">
            <img
              src={panel.image}
              alt={panel.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 md:p-3 bg-primary/20 rounded-xl border border-primary/30 backdrop-blur-xl">
                  <panel.icon className="w-5 h-5 md:w-6 md:h-6 text-primary drop-shadow-[0_0_15px_rgba(255,45,45,0.5)]" />
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white italic uppercase tracking-tighter mb-3 md:mb-4 leading-[0.9] max-w-2xl drop-shadow-2xl">
                {panel.title}
              </h3>
              <p className="text-zinc-300 font-mono text-xs sm:text-sm md:text-base max-w-md italic border-l-4 border-primary/50 pl-3 md:pl-6 leading-relaxed">
                {panel.desc}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
