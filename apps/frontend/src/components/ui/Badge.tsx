interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider border';
  
  const variants = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-zinc-800 text-zinc-400 border-white/5',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    outline: 'bg-transparent text-zinc-500 border-white/10',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
