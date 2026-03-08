import { Link } from 'react-router-dom';
import type { Match } from '@lanista/types';

interface CombatStatsProps {
  match: Match;
}

export function CombatStats({ match }: CombatStatsProps) {
  const p1 = match.player_1;
  const p2 = match.player_2;

  if (!p1 || !p2) return null;

  const p1Id = p1.id ?? match.player_1_id;
  const p2Id = p2.id ?? match.player_2_id;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Player 1 Stats — Blue corner */}
      <div className="rounded-xl border border-arena-blue/20 bg-arena-blue/5 border-l-4 border-l-arena-blue p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-arena-blue/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-arena-blue/20 blur-md rounded-lg animate-pulse" />
            <div className="w-12 h-12 rounded-lg bg-black/60 border border-arena-blue/30 p-1 relative">
              <img src={p1.avatar_url || '/placeholder.png'} alt={p1.name} className="w-full h-full object-cover rounded-md" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Link to={p1Id ? `/agent/${p1Id}` : '#'} className="font-mono text-base font-black text-white uppercase italic tracking-tighter truncate hover:text-blue-400 transition-colors">
                {p1.name || 'Fighter 1'}
              </Link>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-mono text-[8px] text-blue-400/90 uppercase font-black tracking-widest">Active</span>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-end">
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.2em]">HP</span>
                <span className="font-mono text-[10px] font-black text-white tabular-nums italic">
                  {Math.max(0, p1.current_hp || 0)}.00 / {p1.hp || 100}.00
                </span>
              </div>
              <div className="flex gap-1 h-1.5 w-full">
                {Array.from({ length: 15 }).map((_, i) => {
                   const progress = (Math.max(0, p1.current_hp || 0) / (p1.hp || 100)) * 100;
                   const isActive = (i / 15) * 100 < progress;
                   return (
                     <div 
                       key={i} 
                       className={`flex-1 rounded-none transition-all duration-700 ${isActive ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/5'}`}
                     />
                   );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player 2 Stats — Green corner */}
      <div className="rounded-xl border border-secondary/20 bg-secondary/5 border-r-4 border-r-secondary p-5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-full -translate-y-1/2 -translate-x-1/2" />
        <div className="flex flex-row-reverse items-center gap-4 relative z-10">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-secondary/20 blur-md rounded-lg animate-pulse" />
            <div className="w-12 h-12 rounded-lg bg-black/60 border border-secondary/30 p-1 relative">
              <img src={p2.avatar_url || '/placeholder.png'} alt={p2.name} className="w-full h-full object-cover rounded-md" />
            </div>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex flex-row-reverse items-center justify-between gap-2">
              <Link to={p2Id ? `/agent/${p2Id}` : '#'} className="font-mono text-base font-black text-white uppercase italic tracking-tighter truncate hover:text-secondary transition-colors">
                {p2.name || 'Fighter 2'}
              </Link>
              <div className="flex flex-row-reverse items-center gap-1.5 shrink-0">
                <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
                <span className="font-mono text-[8px] text-secondary/90 uppercase font-black tracking-widest">Active</span>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex flex-row-reverse justify-between items-end">
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.2em]">Live</span>
                <span className="font-mono text-[10px] font-black text-white tabular-nums italic">
                  {Math.max(0, p2.current_hp || 0)}.00 / {p2.hp || 100}.00
                </span>
              </div>
              <div className="flex flex-row-reverse gap-1 h-1.5 w-full">
                {Array.from({ length: 15 }).map((_, i) => {
                   const progress = (Math.max(0, p2.current_hp || 0) / (p2.hp || 100)) * 100;
                   const isActive = (i / 15) * 100 < progress;
                   return (
                     <div 
                       key={i} 
                       className={`flex-1 rounded-none transition-all duration-700 ${isActive ? 'bg-secondary shadow-[0_0_8px_rgba(12,165,90,0.5)]' : 'bg-white/5'}`}
                     />
                   );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
