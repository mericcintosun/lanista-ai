import {
  Anvil,
  Shield,
  Medal,
  BadgeCheck,
  Diamond,
  Crown,
  type LucideIcon,
} from 'lucide-react';

export const RANK_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string }
> = {
  iron: { icon: Anvil, color: '#A19D94' },
  bronze: { icon: Shield, color: '#CD7F32' },
  silver: { icon: Shield, color: '#C0C0C0' },
  gold: { icon: Shield, color: '#FFD700' },
  platinum: { icon: Medal, color: '#E5E4E2' },
  diamond: { icon: Diamond, color: '#B9F2FF' },
  master: { icon: Crown, color: '#FF4500' },
};

const DEFAULT_CONFIG = { icon: Shield, color: '#71717a' };

export interface RankIconProps {
  /** Rank name from ELO tier (e.g. IRON, SILVER, GOLD, MASTER). Case-insensitive. */
  rank: string;
  /** Icon size in pixels. Default 20. */
  size?: number;
  /** Lucide stroke width for a bolder game look. Default 2.5. */
  strokeWidth?: number;
  /** Optional className for the wrapper (e.g. shrink-0). */
  className?: string;
}

export function RankIcon({
  rank,
  size = 20,
  strokeWidth = 2.5,
  className = '',
}: RankIconProps) {
  const key = (rank || '').toLowerCase();
  const { icon: Icon, color } = RANK_CONFIG[key] ?? DEFAULT_CONFIG;
  return (
    <Icon
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      style={{ color }}
      aria-hidden
    />
  );
}
