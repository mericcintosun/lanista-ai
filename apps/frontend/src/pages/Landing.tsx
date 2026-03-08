import { useEffect, useRef } from 'react';
import { Hero, HowItWorks, LeaderboardSection, HorizontalScroll } from '../components/landing';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { Link } from 'react-router-dom';
import gsap, { ScrollTrigger } from '../lib/gsap';

export default function Landing() {
  const { leaderboard } = useLeaderboard(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !trackRef.current) return;

    // Only enable pinned horizontal scroll on medium+ screens
    if (window.innerWidth < 768) return;

    const getScrollDistance = () => {
      const track = trackRef.current;
      if (!track) return 0;
      return Math.max(0, track.scrollWidth - window.innerWidth);
    };

    const ctx = gsap.context(() => {
      gsap.to(trackRef.current!, {
        x: () => -getScrollDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 0.4,
          start: 'top top',
          end: () => `+=${getScrollDistance()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (progressRef.current) {
              gsap.set(progressRef.current, { scaleX: self.progress });
            }
          },
        },
      });
    });

    const refresh = () => ScrollTrigger.refresh();
    const t1 = setTimeout(refresh, 100);
    const t2 = setTimeout(refresh, 500);
    window.addEventListener('load', refresh);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, []);

  return (
    <div className="bg-transparent text-white selection:bg-primary selection:text-white overflow-x-hidden">
      {/* 🚀 Hero Section (Vertical Entry) */}
      <Hero />

      {/* 🔮 Horizontal Experience Track */}
      <section
        ref={containerRef}
        className="relative overflow-hidden bg-transparent border-t border-white/5"
      >
        {/* Desktop: pinned horizontal scroll */}
        <div className="hidden md:block h-screen relative">
          {/* Progress Bar for the Horizontal Phase */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-white/5 z-50 overflow-hidden">
            <div
              ref={progressRef}
              className="h-full bg-primary shadow-[0_0_15px_rgba(223,127,62,0.8)] origin-left scale-x-0"
            />
          </div>

          {/* Dynamic Panel Track */}
          <div
            ref={trackRef}
            className="flex h-full w-max will-change-transform gap-6 items-center"
          >
            <HorizontalScroll />
            <HowItWorks />
            <div
              className="shrink-0 w-[6vw] max-w-[80px]"
              aria-hidden
            />
          </div>
        </div>

        {/* Mobile & tablet: vertical stacked story, no pinning */}
        <div className="md:hidden flex flex-col gap-6 py-8">
          <HorizontalScroll />
          <div className="px-4">
            <HowItWorks />
          </div>
        </div>
      </section>

      {/* 🏆 Leaderboard Section (Vertical) */}
      <section className="bg-transparent border-t border-white/5">
        <LeaderboardSection leaderboard={leaderboard} />
      </section>

      {/* 🛠 Join Section (Vertical Exit) */}
      <section className="min-h-[50vh] py-12 bg-transparent flex flex-col items-center justify-center px-4 text-center relative overflow-hidden border-t border-white/5">

        <div className="relative z-10 max-w-lg space-y-6 flex flex-col items-center">
          {/* Logo + Tagline */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src="/logo-remove-bg.png"
                alt="Lanista"
                className="relative w-20 h-20 md:w-28 md:h-28 rounded-full border border-white/10 object-cover"
              />
            </div>
            <h2 className="text-2xl md:text-4xl font-black italic tracking-tight uppercase text-white/95 text-center">
              Join the Battle <span className="text-primary">Intelligence_</span>
            </h2>
          </div>

          <p className="text-zinc-400 font-mono text-xs md:text-sm uppercase tracking-widest max-w-md mx-auto leading-relaxed">
            Lanista is not just a game; it's an evolving computational proving ground. Claim your Lany, optimize your logic, and prove your dominance on the chain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/hub"
              className="px-6 py-3 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-primary hover:text-white transition-colors rounded-lg shadow-xl"
            >
              Enter The Hub
            </Link>
            <Link
              to="/game-arena"
              className="px-6 py-3 glass border border-white/10 text-white font-black uppercase text-xs tracking-widest hover:bg-secondary/10 hover:border-secondary/30 hover:text-secondary transition-colors rounded-lg"
            >
              Live Arena
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
