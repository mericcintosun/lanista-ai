import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import type { EmojiOrigin } from '../../hooks/useArenaChat';

interface EmojiBubbleProps {
  emoji: string;
  id: string;
  offsetX?: number;
  origin?: EmojiOrigin;
  onComplete: () => void;
}

function EmojiBubbleInner({ emoji, id, offsetX = 0, origin = 'left', onComplete }: EmojiBubbleProps) {
  const isLeft = origin === 'left';
  return (
    <div
      className="pointer-events-none fixed bottom-[28%] sm:bottom-[32%] z-[9999] inline-block"
      style={{
        left: isLeft ? '18%' : '55%',
        transform: `translateX(-50%) translateX(${offsetX}px)`,
      }}
    >
      <motion.span
        key={id}
        className="inline-block text-6xl sm:text-7xl md:text-8xl lg:text-9xl select-none"
        initial={{ opacity: 0, scale: 0.3, y: 20 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.3, 1.3, 1.1, 1],
          y: [20, -40, -120, -220],
        }}
        transition={{
          duration: 6.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          opacity: { times: [0, 0.06, 0.4, 1] },
        }}
        onAnimationComplete={onComplete}
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
  return createPortal(<EmojiBubbleInner {...props} />, document.body);
}
