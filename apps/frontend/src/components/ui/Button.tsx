import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-mono text-xs uppercase tracking-widest transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(223,127,62,0.3)] hover:shadow-[0_0_25px_rgba(223,127,62,0.5)]',
      secondary: 'bg-secondary text-white hover:bg-secondary/90 border border-secondary/30 shadow-[0_0_15px_rgba(12,165,90,0.2)]',
      outline: 'bg-transparent border border-white/10 text-zinc-400 hover:border-white/40 hover:text-white',
      ghost: 'bg-transparent text-zinc-500 hover:text-white hover:bg-white/5',
      danger: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 gap-1.5',
      md: 'px-5 py-2.5 gap-2',
      lg: 'px-8 py-3.5 gap-3 text-sm',
      icon: 'p-2.5 aspect-square',
    };

    return (
      <motion.button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
