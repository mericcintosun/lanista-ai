import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const baseClasses = "relative overflow-hidden bg-white/5";
  const roundedClasses = 
    variant === 'circle' ? 'rounded-full' : 
    variant === 'rect' ? 'rounded-xl' : 'rounded';

  return (
    <div className={`${baseClasses} ${roundedClasses} ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
