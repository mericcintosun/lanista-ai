import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
  maxWidth?: string;
  titleSize?: 'default' | 'sm';
}

export function PageHeader({ 
  title, 
  subtitle, 
  badge, 
  actions, 
  description,
  maxWidth = "max-w-4xl",
  titleSize = "default"
}: PageHeaderProps) {
  const titleCls = titleSize === 'sm' 
    ? 'text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.9] break-words px-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]'
    : 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.9] break-words px-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]';
  const shadowCls = titleSize === 'sm'
    ? 'text-2xl sm:text-3xl md:text-4xl'
    : 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl';

  return (
    <section className={`text-center pt-6 px-4 flex flex-col items-center justify-center relative ${titleSize === 'sm' ? 'min-h-0 space-y-4' : 'min-h-[30vh] space-y-8'}`}>
      <div className="space-y-4 w-full">
        {subtitle && (
          <p className="font-mono text-[10px] md:text-xs text-primary font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">
            {subtitle}
          </p>
        )}
        
        <div className={`relative inline-block w-full ${maxWidth} mx-auto`}>
          <h1 className={titleCls}>
            {title}
          </h1>
          <span className={`absolute inset-0 z-0 translate-x-[3px] translate-y-[3px] text-primary/20 blur-[2px] italic font-black ${shadowCls} tracking-tighter uppercase leading-[0.9] pointer-events-none select-none`}>
            {title}
          </span>
        </div>

        {badge && (
          <div className="pt-2">
            {badge}
          </div>
        )}
      </div>

      {(description || actions) && (
        <div className="space-y-6">
          {description && (
            <div className="text-zinc-300 font-mono text-sm md:text-base max-w-2xl mx-auto leading-relaxed uppercase tracking-wider">
              {description}
            </div>
          )}
          
          {actions && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {actions}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
