interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div className={`relative group ${className}`}>
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      )}
      <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b border-white/5 bg-black/20 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-white/5 bg-black/10 ${className}`}>
      {children}
    </div>
  );
}
