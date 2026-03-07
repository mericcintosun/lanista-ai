import confetti from 'canvas-confetti';
import { getEloTier } from './elo';

/** Fire tier-colored confetti for ~3 seconds on agent profile load */
export function fireTierConfetti(elo: number, hasPlayed: boolean) {
  const tier = getEloTier(elo, hasPlayed);
  const colors = tier.confettiColors;

  const duration = 3000;
  const burstInterval = 200;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 8,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 8,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 6,
      spread: 100,
      origin: { y: 0.7 },
      colors,
    });

    if (Date.now() < end) {
      setTimeout(frame, burstInterval);
    }
  };

  frame();
}
