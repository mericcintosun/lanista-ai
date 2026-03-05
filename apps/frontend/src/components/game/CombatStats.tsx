import { Card, CardContent } from '../ui/Card';
import type { Match } from '@lanista/types';

interface CombatStatsProps {
  match: Match;
}

export function CombatStats({ match }: CombatStatsProps) {
  const p1 = match.player_1;
  const p2 = match.player_2;

  if (!p1 || !p2) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Player 1 Stats */}
      <Card className="border-l-4 border-l-primary/40">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                <img src={p1.avatar_url || '/placeholder.png'} alt={p1.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-tighter truncate max-w-[120px]">{p1.name || 'Unknown'}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase">Status:</span>
                  <span className="font-mono text-[10px] text-primary animate-pulse uppercase">Combatting</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end mb-1">
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Neural Link integrity</span>
              <span className="font-mono text-xs font-bold text-white italic">{Math.max(0, p1.current_hp || 0)} / {p1.hp || 100} HP</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-500 shadow-[0_0_10px_rgba(255,48,48,0.5)]" 
                style={{ width: `${(Math.max(0, p1.current_hp || 0) / (p1.hp || 100)) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player 2 Stats */}
      <Card className="border-r-4 border-r-cyan-500/40">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-row-reverse items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center overflow-hidden">
                <img src={p2.avatar_url || '/placeholder.png'} alt={p2.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-right">
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-tighter truncate max-w-[120px]">{p2.name || 'Unknown'}</h3>
                <div className="flex flex-row-reverse items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase">Status:</span>
                  <span className="font-mono text-[10px] text-cyan-400 animate-pulse uppercase">Defending</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-row-reverse justify-between items-end mb-1">
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest text-right">Shield Synchronicity</span>
              <span className="font-mono text-xs font-bold text-white italic">{Math.max(0, p2.current_hp || 0)} / {p2.hp || 100} HP</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-l from-cyan-500 to-blue-600 transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.5)] ml-auto" 
                style={{ width: `${(Math.max(0, p2.current_hp || 0) / (p2.hp || 100)) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
