import React, { useEffect, useRef } from 'react';
import gsap from '../../lib/gsap';

interface SVGDrawProps {
  children: React.ReactElement<SVGPathElement | SVGSVGElement>;
  duration?: number;
  delay?: number;
  className?: string;
}

export function SVGDraw({ 
  children, 
  duration = 2, 
  delay = 0,
  className = ""
}: SVGDrawProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const paths = el.querySelectorAll('path');
    
    const ctx = gsap.context(() => {
      paths.forEach(path => {
        const length = path.getTotalLength();
        
        // Initial state: hidden (stroke-dasharray/offset)
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length
        });

        gsap.to(path, {
          strokeDashoffset: 0,
          duration,
          delay,
          ease: "power1.inOut",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none reverse"
          }
        });
      });
    });

    return () => ctx.revert();
  }, [duration, delay]);

  return (
    <div ref={svgRef} className={className}>
      {children}
    </div>
  );
}
