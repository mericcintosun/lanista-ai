import { Activity, Swords } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import type { Match, CombatLog } from '@lanista/types';

interface CombatLogsProps {
  logs: CombatLog[];
  match: Match | null;
}

export function CombatLogs({ logs, match }: CombatLogsProps) {
  const getActorName = (actorId: string) => {
    if (match?.player_1?.id === actorId) return match.player_1.name;
    if (match?.player_2?.id === actorId) return match.player_2.name;
    return 'Unknown';
  };

  return (
    <Card className="flex flex-col h-full bg-black/40 border-white/5 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <h3 className="font-mono text-xs font-black uppercase tracking-widest text-white">Live Data Stream</h3>
        </div>
        <div className="px-2 py-0.5 bg-primary/20 rounded border border-primary/30 font-mono text-[9px] text-primary animate-pulse">
          ENCRYPTED
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed p-0 custom-scrollbar">
        <div className="px-5 py-6 space-y-4">
          {logs.length === 0 ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center opacity-20 italic space-y-3 grayscale translate-y-4">
              <Swords className="w-8 h-8" />
              <p className="uppercase tracking-[0.2em] text-[10px]">Awaiting sequence initiation...</p>
            </div>
          ) : (
            [...logs].reverse().map((log, idx) => {
              const actorName = getActorName(log.actor_id);
              const isLatest = idx === 0;

              return (
                <div
                  key={log.id || idx}
                  className={`flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300 ${isLatest ? 'text-primary' : 'text-zinc-500'}`}
                >
                  <div className="shrink-0 font-bold opacity-30">[{String(logs.length - idx).padStart(3, '0')}]</div>
                  <div className="flex-1">
                    <span className={`uppercase font-bold tracking-tighter mr-2 ${isLatest ? 'text-primary' : 'text-zinc-400'}`}>
                      {actorName}:
                    </span>
                    {log.narrative}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
