import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { Swords, ChevronLeft, Activity, Search, ShieldAlert, Gamepad2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import type { Match } from '@lanista/types';
import { API_URL } from '../lib/api';

export function BattleArena() {
  const { matchId: routeMatchId } = useParams<{ matchId: string }>();
  const { match, logs } = useCombatRealtime(routeMatchId || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!routeMatchId) {
      const fetchLiveMatches = async () => {
        try {
          const res = await fetch(`${API_URL}/hub/live`);
          const data = await res.json();
          if (data.matches) setLiveMatches(data.matches);
        } catch (err) {
          console.error('Failed to fetch live matches', err);
        }
      };

      fetchLiveMatches();
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchLiveMatches, 5000);
      return () => { clearInterval(interval); };
    }
  }, [routeMatchId]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-[90vh] flex flex-col items-center relative overflow-hidden px-6 pb-24">
      {/* Background Flair: Radial Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-6xl flex flex-col items-center">
        {/* ─── HEADER ─── */}
        <section className="text-center py-16 space-y-8 flex flex-col items-center justify-center min-h-[30vh] px-4">
          <div className="space-y-4 w-full">
            <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// LIVE NEURAL LINK</p>
            <div className="relative inline-block w-full">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.8] break-words px-2">
                LIVE ARENA
              </h1>
              {/* Theme Red Shadows (No mix-blend-difference) */}
              <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.8] pointer-events-none">
                LIVE ARENA
              </span>
            </div>
          </div>

        </section>

        {/* ─── MAIN CONTENT ─── */}
        {!routeMatchId ? (
          <div className="w-full flex flex-col items-center gap-12">
            {liveMatches.length > 0 ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveMatches.map((liveMatch) => (
                  <Link key={liveMatch.id} to={`/arena/${liveMatch.id}`} className="group">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="relative p-10 glass rounded-3xl transition-all flex flex-col gap-8 overflow-hidden"
                    >
                      <div className="absolute inset-0 noise pointer-events-none" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Match #{liveMatch.id.substring(0, 8)}</span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-500 uppercase tracking-widest">
                          <Activity className="w-3 h-3" /> Live Now
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        {/* Player 1 */}
                        <div className="flex-1 flex items-center justify-end gap-3">
                          <div className="flex flex-col items-end">
                            <h4 className="font-black text-white text-xl tracking-tighter italic uppercase truncate">
                              {liveMatch.player_1?.name}
                            </h4>
                            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                              Origin: {(liveMatch.player_1?.id ?? '').substring(0, 8)}
                            </p>
                          </div>
                          <img
                            src={
                              liveMatch.player_1?.avatar_url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${liveMatch.player_1?.name ?? 'P1'}`
                            }
                            alt={liveMatch.player_1?.name ?? 'Player 1'}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-900 border border-white/10 object-cover"
                          />
                        </div>

                        <div className="text-zinc-800 font-black italic text-xl px-2">VS</div>

                        {/* Player 2 */}
                        <div className="flex-1 flex items-center justify-start gap-3">
                          <img
                            src={
                              liveMatch.player_2?.avatar_url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${liveMatch.player_2?.name ?? 'P2'}`
                            }
                            alt={liveMatch.player_2?.name ?? 'Player 2'}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-900 border border-white/10 object-cover"
                          />
                          <div className="flex flex-col items-start">
                            <h4 className="font-black text-white text-xl tracking-tighter italic uppercase truncate">
                              {liveMatch.player_2?.name}
                            </h4>
                            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                              Origin: {(liveMatch.player_2?.id ?? '').substring(0, 8)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="font-mono text-[9px] text-white uppercase tracking-[0.3em] flex items-center gap-2">
                          <Swords className="w-3 h-3" /> Establish Connection
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              /* DORMANT TERMINAL EMPTY STATE */
              <div className="w-full max-w-4xl glass rounded-3xl p-16 relative overflow-hidden group min-h-[400px] flex items-center justify-center">
                <div className="absolute inset-0 noise pointer-events-none" />
                {/* Scanning Line Effect */}
                <motion.div
                  initial={{ y: "-100%" }}
                  animate={{ y: "100%" }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] bg-gradient-to-b from-transparent via-white to-transparent h-[200px]"
                />

                <div className="relative z-10 flex flex-col items-center justify-center space-y-10 text-center">
                  <div className="relative">
                    <div className="w-20 h-20 border border-white/10 rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 text-zinc-800" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-zinc-400 font-mono text-sm md:text-base uppercase tracking-[0.3em] max-w-md leading-relaxed">
                      No active battles currently in the arena. <br />
                      <span className="text-zinc-700">Waiting for agents to initialize combat protocol...</span>
                    </p>
                    <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2">
                      Awaiting Neural Uplink <span className="block w-2 h-4 bg-zinc-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Link
                to={`/game-arena`}
                className="px-8 py-4 bg-transparent border border-cyan-500/40 text-cyan-400 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-cyan-500/10 hover:border-cyan-400 flex items-center gap-2 group"
              >
                <Gamepad2 className="w-4 h-4" /> Game Arena
              </Link>
              <Link
                to="/hub"
                className="px-8 py-4 bg-transparent border border-red-500/50 text-red-500 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_20px_rgba(232,65,66,0.3)] flex items-center gap-3 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />&lt; RETURN TO HUB
              </Link>
            </div>
          </div>
        ) : !match ? (
          /* LOADING STATE */
          <div className="flex flex-col items-center justify-center gap-8 min-h-[50vh]">
            <div className="w-16 h-16 border-2 border-zinc-900 border-t-red-500 rounded-full animate-spin" />
            <div className="space-y-2 text-center">
              <p className="font-mono text-xs text-red-500 uppercase tracking-[0.2em]">Establishing Combat Link</p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Bridging Avalanche RPC :: Fuji-Testnet</p>
            </div>
          </div>
        ) : match.status === 'aborted' ? (
          /* ABORTED STATE */
          <div className="w-full max-w-2xl bg-red-500/[0.03] border border-red-500/20 p-12 flex flex-col items-center text-center gap-8">
            <ShieldAlert className="w-16 h-16 text-red-500 opacity-50" />
            <div className="space-y-4">
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Signal Lost // Aborted</h2>
              <p className="font-mono text-xs text-zinc-500 max-w-sm leading-relaxed uppercase tracking-widest">
                Combat sequence terminated by oracle protocol. <br />
                Critical agent failure or network timeout detected.
              </p>
            </div>
            <Link to="/" className="px-8 py-4 border border-red-500/30 text-red-500 font-mono text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/10 transition-colors">
              Re-initialize Hub Connection
            </Link>
          </div>
        ) : (
          /* ACTIVE BATTLE UI */
          <div className="w-full flex flex-col items-center gap-20">
            {/* ─── THE FIGHTERS ─── */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-11 gap-4 items-center max-w-7xl">

              {/* Agent A */}
              <div className="lg:col-span-5 flex flex-col gap-6 text-right">
                <div className="flex items-center gap-6 justify-end">
                  <div className="space-y-1">
                    <h2 className="font-black text-white text-3xl italic tracking-tighter uppercase">{match.player_1?.name}</h2>
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                      <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest font-bold">Agent Protocol // Connected</p>
                    </div>
                  </div>
                  <img
                    src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`}
                    className="w-24 h-24 bg-zinc-900 border border-white/10 p-1.5 object-cover grayscale brightness-125"
                  />
                </div>

                {/* HP BAR (LEFT/CYAN) */}
                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    <span className="font-bold text-white">{match.player_1?.current_hp ?? 0} / {match.player_1?.hp ?? 100}</span>
                    <span className="font-bold">Systems_HP</span>
                  </div>
                  <div className="w-full h-5 bg-white/5 border border-white/5 relative overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${((match.player_1?.current_hp ?? 0) / (match.player_1?.hp ?? 100)) * 100}%` }}
                      className="h-full bg-cyan-400 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ width: '200%' }} />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* VS DECORATOR */}
              <div className="lg:col-span-1 flex items-center justify-center py-8">
                <div className="relative">
                  <div className="text-[#E84142] font-black italic text-6xl opacity-30 tracking-tighter select-none">VS</div>
                  {match.status === 'finished' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="bg-white text-black font-black text-[10px] uppercase px-3 py-1 -rotate-12 whitespace-nowrap border-2 border-black">SEALED</div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Agent B */}
              <div className="lg:col-span-5 flex flex-col gap-6 text-left">
                <div className="flex items-center gap-6 justify-start">
                  <img
                    src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`}
                    className="w-24 h-24 bg-zinc-900 border border-white/10 p-1.5 object-cover grayscale brightness-125"
                  />
                  <div className="space-y-1">
                    <h2 className="font-black text-white text-3xl italic tracking-tighter uppercase">{match.player_2?.name}</h2>
                    <div className="flex items-center gap-2 justify-start">
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(232,65,66,0.6)]" />
                      <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest font-bold">Agent Protocol // Connected</p>
                    </div>
                  </div>
                </div>

                {/* HP BAR (RIGHT/RED) */}
                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    <span className="font-bold">Systems_HP</span>
                    <span className="font-bold text-white">{match.player_2?.current_hp ?? 0} / {match.player_2?.hp ?? 100}</span>
                  </div>
                  <div className="w-full h-5 bg-white/5 border border-white/5 relative overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${((match.player_2?.current_hp ?? 0) / (match.player_2?.hp ?? 100)) * 100}%` }}
                      className="h-full bg-[#E84142] relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ width: '200%' }} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── COMBAT TIMELINE ─── */}
            <div className="w-full max-w-4xl glass rounded-3xl shadow-2xl relative overflow-hidden border border-white/10 bg-black/40">
              <div className="absolute inset-0 noise pointer-events-none opacity-10" />

              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-red-500 uppercase tracking-[0.3em]">
                    Combat Feed
                  </p>
                  <p className="text-xs text-zinc-400 uppercase tracking-[0.18em]">
                    Turn-by-turn resolution of the engagement
                  </p>
                </div>

              </div>

              <div
                ref={scrollRef}
                className="h-[380px] overflow-y-auto px-6 py-6 selection:bg-red-500/20"
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

                          // ATTACK / CRITICAL and other offensive actions
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
                                  ? 'border-red-500 bg-red-500/30'
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
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
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
                                      : 'bg-red-500/15 text-red-400 border-red-500/40'
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
                          <BlinkCursor />
                        </div>
                      </motion.div>
                    )}

                    {!logs.length && (
                      <div className="flex h-full items-center justify-center py-16">
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.3em]">
                          Neural uplink synchronizing...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── FOOTER ACTIONS ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {match && (
                <Link
                  to={`/game-arena/${match.id}`}
                  className="px-10 py-5 bg-transparent border border-cyan-500/40 text-cyan-400 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] flex items-center gap-3 group"
                >
                  <Gamepad2 className="w-4 h-4" /> Watch in Game
                </Link>
              )}
              <Link
                to="/hub"
                className="px-12 py-5 bg-transparent border border-red-500/50 text-red-500 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_30px_rgba(232,65,66,0.3)] flex items-center gap-3 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />&lt; RETURN TO HUB
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BlinkCursor() {
  return (
    <span
      className="inline-block w-2 h-4 bg-white align-middle ml-1"
    />
  );
}
