import { useEffect } from 'react';
import { getLenis } from '../lib/lenis-instance';

/**
 * Locks background scrolling (page + Lenis) while the component using this hook is mounted.
 * Restores previous styles and resumes Lenis on unmount.
 */
export function useLockBodyScroll(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = getLenis();
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      lenis?.start();
    };
  }, [enabled]);
}


