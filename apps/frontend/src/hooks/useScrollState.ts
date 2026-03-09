import { useState, useEffect, useRef } from 'react';
import { getLenis } from '../lib/lenis-instance';

const SCROLL_THRESHOLD_ENTER = 36;
const SCROLL_THRESHOLD_LEAVE = 12;

export const NAV_ANIM_DURATION = 0.35;

/**
 * Returns scrolled state with hysteresis to prevent flickering.
 * Uses Lenis scroll event when available, else window scroll.
 */
export function useScrollState(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = (scrollY: number) => {
      setScrolled((prev) => {
        if (scrollY > SCROLL_THRESHOLD_ENTER) return true;
        if (scrollY < SCROLL_THRESHOLD_LEAVE) return false;
        return prev;
      });
    };

    const lenis = getLenis();
    if (lenis) {
      const handler = (instance: { scroll: number }) => update(instance.scroll);
      lenis.on('scroll', handler);
      update(lenis.scroll);
      return () => lenis.off('scroll', handler);
    }

    const onScroll = () => update(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    update(window.scrollY);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return scrolled;
}
