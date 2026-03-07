import React, { useEffect, useRef } from 'react';
import gsap from '../../lib/gsap';

interface RevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  stagger?: number;
}

export function Reveal({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 1.2, 
  distance = 50,
  className = '',
  stagger = 0
}: RevealProps) {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Set initial state immediately to avoid FOUC
      gsap.set(el, { 
        visibility: 'visible',
        opacity: 0,
        x: direction === 'left' ? -distance : direction === 'right' ? distance : 0,
        y: direction === 'up' ? distance : direction === 'down' ? -distance : 0,
      });

      const targets = stagger > 0 ? el.children : el;
      
      gsap.to(targets, {
        x: 0,
        y: 0,
        opacity: 1,
        duration,
        delay,
        stagger,
        ease: "power4.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%", // Trigger slightly later for better visibility
          toggleActions: "play none none reverse"
        }
      });
    });

    return () => ctx.revert();
  }, [direction, delay, duration, distance, stagger]);

  return (
    <div 
      ref={revealRef} 
      className={className}
      style={{ visibility: 'hidden' }} // Hide initially to prevent jump
    >
      {children}
    </div>
  );
}
