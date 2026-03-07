import { Activity, Swords } from 'lucide-react';
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
    <div className="flex flex-col h-full min-h-0 bg-black/80 border border-white/5 backdrop-blur-3xl overflow-hidden rounded-xl sm:rounded-2xl relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-4 sm:px-6 py-3 sm:py-4 shrink-0 border-b border-white/5 bg-white/[0.02] relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-pulse" />
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary relative" />
          </div>
          <h3 className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-zinc-100 italic truncate">Telemetry_Stream</h3>
        </div>
        <div className="px-2 sm:px-2.5 py-0.5 bg-primary/10 rounded-sm border border-primary/20 font-mono text-[7px] sm:text-[8px] text-primary/70 tracking-widest font-black uppercase shrink-0 self-start sm:self-auto">
          Neural_Link: Secured
        </div>
      </header>

      <div
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden font-mono text-[8px] sm:text-[10px] leading-relaxed overscroll-contain relative"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-2 sm:space-y-3">
          {logs.length === 0 ? (
            <div className="min-h-[160px] sm:min-h-[200px] flex flex-col items-center justify-center opacity-30 space-y-3 sm:space-y-4 translate-y-2 sm:translate-y-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border border-white/5 rounded-lg flex items-center justify-center bg-white/[0.02]">
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700" />
              </div>
              <p className="uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[7px] sm:text-[8px] font-black text-zinc-600 italic text-center px-2">Awaiting sequence...</p>
            </div>
          ) : (
            [...logs].reverse().map((log, idx) => {
              const actorName = getActorName(log.actor_id);
              const isLatest = idx === 0;

              return (
                <div
                  key={log.id || idx}
                  className={`flex gap-1.5 sm:gap-4 animate-in fade-in slide-in-from-left-4 duration-500 py-0.5 sm:py-1 border-l-2 pl-2 sm:pl-4 transition-all min-w-0 ${
                    isLatest ? 'border-l-primary text-white bg-primary/5' : 'border-l-white/5 text-zinc-500'
                  }`}
                >
                  <div className="shrink-0 font-black opacity-20 tabular-nums text-[7px] sm:text-[10px]">0x{String(logs.length - idx).padStart(3, '0')}</div>
                  <div className="flex-1 tracking-tight min-w-0 overflow-hidden">
                    <span className={`uppercase font-black italic tracking-tighter mr-1.5 sm:mr-3 shrink-0 inline-block text-[8px] sm:text-[10px] ${
                      isLatest ? 'text-primary' : 'text-zinc-600'
                    }`}>
                      {actorName || 'SYS_INT'} &gt;&gt;
                    </span>
                    <span className={`inline break-words text-[8px] sm:text-[10px] ${isLatest ? 'font-medium' : 'font-normal opacity-80'}`}>
                      {log.narrative}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* SCAN LINE EFFECT */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/[0.01] to-transparent h-20 w-full animate-scan-line opacity-20" />
      </div>
    </div>
  );
}
