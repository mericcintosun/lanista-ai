import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Activity, ShieldAlert } from 'lucide-react';
import type { Match } from '@lanista/types';

interface MatchLog {
  id?: string | number;
  actor_id: string;
  action_type: string;
  value: number;
  narrative?: string;
}

interface CombatTimelineProps {
  match: Match;
  logs: MatchLog[];
}

export function CombatTimeline({ match, logs }: CombatTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full max-w-4xl glass rounded-3xl shadow-2xl relative overflow-hidden border border-white/10 bg-black/40">
      <div className="absolute inset-0 noise pointer-events-none opacity-10" />

      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-primary uppercase tracking-[0.3em]">
            Combat log
          </p>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.18em]">
            Turn-by-turn battle log
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-[380px] overflow-y-auto px-6 py-6 selection:bg-primary/20"
      >
        <div className="relative pl-5">
          <div className="absolute left-[6px] top-0 bottom-0 w-px bg-zinc-800/80" />

          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {logs.map((log, idx) => {
                const isP1 = log.actor_id === match.player_1_id;
                const isCritical =
                  log.action_type === 'CRITICAL' ||
                  log.action_type === 'HEAVY_ATTACK';
                const actorCode = (log.actor_id ?? '')
                  .slice(-4)
                  .toUpperCase();
                const actorName = isP1
                  ? match.player_1?.name || actorCode
                  : match.player_2?.name || actorCode;
                const targetName = isP1
                  ? match.player_2?.name || 'opponent'
                  : match.player_1?.name || 'opponent';

                const narrative = (() => {
                  const baseValue = log.value;

                  if (!log.action_type) {
                    return {
                      type: 'custom' as const,
                      text: log.narrative ?? '',
                    };
                  }

                  if (log.action_type.includes('HEAL')) {
                    return {
                      type: 'heal' as const,
                      text: `restored ${baseValue} HP.`,
                    };
                  }

                  if (log.action_type.includes('DEFEND')) {
                    return {
                      type: 'defend' as const,
                      text: `defended and counter-attacked ${targetName} for ${baseValue} damage.`,
                    };
                  }

                  return {
                    type: 'attack' as const,
                    text: `attacked ${targetName} for ${baseValue} damage.`,
                  };
                })();

                const actionIcon = (() => {
                  if (!log.action_type) return null;
                  if (log.action_type.includes('HEAL')) return <Activity className="w-3 h-3 mr-1" />;
                  if (log.action_type.includes('DEFEND')) return <ShieldAlert className="w-3 h-3 mr-1" />;
                  return <Swords className="w-3 h-3 mr-1" />;
                })();

                return (
                  <motion.div
                    key={log.id || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-4"
                  >
                    <div className="relative mt-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full border-2 ${isCritical
                          ? 'border-primary bg-primary/30'
                          : isP1
                            ? 'border-cyan-400 bg-cyan-400/20'
                            : 'border-zinc-400 bg-zinc-400/20'
                          }`}
                      />
                    </div>

                    <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                            Turn {idx + 1}
                          </span>
                          <span className="h-3 w-px bg-zinc-700" />
                          <span
                            className={`text-[10px] font-mono uppercase tracking-[0.18em] ${isP1 ? 'text-cyan-300' : 'text-zinc-400'
                              }`}
                          >
                            {actorCode}
                          </span>
                        </div>

                        {log.action_type && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] ${isCritical
                              ? 'bg-primary/20 text-primary border border-primary/40'
                              : 'bg-zinc-900/80 text-zinc-400 border border-zinc-700'
                              }`}
                          >
                            {actionIcon}
                            {log.action_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-zinc-100 leading-relaxed">
                        <span className="font-semibold text-white">
                          {actorName}
                        </span>{' '}
                        {narrative.text}
                      </p>

                      {log.value > 0 && (
                        <div className="mt-2 flex items-center justify-end text-[11px] font-mono uppercase tracking-[0.18em]">
                          <span
                            className={`px-2 py-0.5 rounded-full border font-bold ${log.action_type?.includes('HEAL')
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                              : 'bg-primary/15 text-primary border-primary/40'
                              }`}
                          >
                            {log.action_type?.includes('HEAL') ? '+' : '-'}
                            {log.value} HP
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {match.status === 'finished' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 mt-2 border-t border-zinc-800"
              >
                <p className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 mb-2">
                  Sequence Outcome
                </p>
                <p className="text-primary font-black uppercase text-sm tracking-tight italic">
                  Winner:&nbsp;
                  {match.winner_id === match.player_1_id
                    ? match.player_1?.name
                    : match.player_2?.name}
                </p>

                <div className="mt-3">
                  <span className="inline-block w-2 h-4 bg-white align-middle ml-1" />
                </div>
              </motion.div>
            )}

            {!logs.length && (
              <div className="flex h-full items-center justify-center py-16">
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.3em]">
                  Loading…
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
