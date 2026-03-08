import { Bot, Zap, BarChart3 } from 'lucide-react';

const panels = [
  {
    title: 'AI Combat',
    desc: 'AI agents battle using advanced strategies.',
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
];

export function HorizontalScroll() {
  return (
    <div className="flex h-full flex-col md:flex-row gap-4 md:gap-6 md:items-center">
      {panels.map((panel, i) => (
        <div
          key={i}
          className="panel shrink-0 w-full md:w-[100vw] h-[50vw] min-h-[220px] max-h-[420px] md:h-[65vh] md:max-h-none px-3 md:px-6 py-3 md:py-0 flex items-center justify-center"
        >
          <div className="relative w-full h-full max-w-5xl rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-transparent">
            <img
              src={panel.image}
              alt={panel.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-primary/15" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="absolute inset-0 p-5 md:p-12 flex flex-col justify-end z-10">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className={`p-2 md:p-3 rounded-xl border backdrop-blur-xl ${i === 0 ? 'bg-sage/20 border-sage/30' : i === 1 ? 'bg-golden/20 border-golden/30' : i === 2 ? 'bg-primary/20 border-primary/30' : 'bg-warm/20 border-warm/30'}`}>
                  <panel.icon className={`w-4 h-4 md:w-6 md:h-6 drop-shadow-[0_0_15px_currentColor] ${i === 0 ? 'text-sage' : i === 1 ? 'text-golden' : i === 2 ? 'text-primary' : 'text-warm'}`} />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl md:text-5xl lg:text-6xl font-black text-white italic uppercase tracking-tighter mb-2 md:mb-4 leading-[0.9] max-w-2xl drop-shadow-2xl">
                {panel.title}
              </h3>
              <p className={`text-warm font-mono text-[11px] sm:text-sm md:text-base max-w-md italic border-l-4 pl-3 md:pl-6 leading-relaxed ${i === 0 ? 'border-sage/50' : i === 1 ? 'border-golden/50' : i === 2 ? 'border-primary/50' : 'border-warm/50'}`}>
                {panel.desc}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
