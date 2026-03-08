import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import type { EmojiOrigin } from '../../hooks/useArenaChat';

const EMOJI_DURATION_MS = 20_000;

export interface EmojiBubbleProps {
  emoji: string;
  id: string;
  offsetX?: number;
  origin?: EmojiOrigin;
  onComplete: () => void;
  containerRef?: RefObject<HTMLElement | null>;
}

function EmojiBubbleInner({ emoji, id, offsetX = 0, origin = 'left' }: Omit<EmojiBubbleProps, 'containerRef' | 'onComplete'>) {
  const isLeft = origin === 'left';
  return (
    <div
      className="pointer-events-none absolute bottom-[20%] z-[9999] inline-block"
      style={{
        left: isLeft ? '12%' : undefined,
        right: isLeft ? undefined : '12%',
        transform: `translateX(${isLeft ? offsetX : -offsetX}px)`,
      }}
    >
      <motion.span
        key={id}
        className="inline-block text-5xl sm:text-6xl md:text-7xl lg:text-8xl select-none"
        initial={{ opacity: 0, scale: 0.3, y: 20 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.3, 1.2, 1.0],
          y: [20, -20, -120],
        }}
        transition={{
          duration: EMOJI_DURATION_MS / 1000,
          opacity: { times: [0, 0.05, 0.90, 1], ease: 'linear' },
          scale: { times: [0, 0.05, 1], ease: 'easeOut' },
          y: { ease: 'linear' },
        }}
        style={{
          textShadow: '0 0 24px rgba(255,255,255,0.8), 0 0 48px rgba(59,130,246,0.5)',
          filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.5))',
        }}
      >
        {emoji}
      </motion.span>
    </div>
  );
}

export function EmojiBubble(props: EmojiBubbleProps) {
  const { containerRef, onComplete, ...rest } = props;
  const onCompleteRef = useRef(onComplete);
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useLayoutEffect(() => {
    const target = containerRef?.current ?? document.body;
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
    target.appendChild(el);
    setWrapper(el);

    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
      setWrapper((current) => (current === el ? null : current));
    };
  }, [containerRef]);

  // Timer starts only after `wrapper` is set — i.e. exactly when the animation
  // begins rendering. This survives React Strict Mode's effect cleanup/remount
  // cycle: the timer is cleared when wrapper goes null and restarted when the
  // new wrapper is assigned, so the 20-second countdown is always accurate.
  useEffect(() => {
    if (!wrapper) return;
    const timeoutId = window.setTimeout(() => {
      onCompleteRef.current();
    }, EMOJI_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [wrapper]);

  if (!wrapper) return null;

  return createPortal(<EmojiBubbleInner {...rest} />, wrapper);
}
