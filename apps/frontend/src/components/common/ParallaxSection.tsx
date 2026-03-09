import { useEffect, useRef } from 'react';
import gsap from '../../lib/gsap';

interface ParallaxSectionProps {
  children: React.ReactNode;
  backgroundImage: string;
  speed?: number;
  className?: string;
  overlay?: string;
}

export function ParallaxSection({ 
  children, 
  backgroundImage, 
  speed = 0.5, 
  className = "",
  overlay = "bg-black/60"
}: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const bg = bgRef.current;
    if (!section || !bg) return;

    const ctx = gsap.context(() => {
      gsap.to(bg, {
        yPercent: 20 * speed,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });

    return () => ctx.revert();
  }, [speed]);

  return (
    <section ref={sectionRef} className={`relative overflow-hidden ${className}`}>
      <div 
        ref={bgRef}
        className="absolute inset-0 z-0 scale-125"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className={`absolute inset-0 z-1 ${overlay}`} />
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
