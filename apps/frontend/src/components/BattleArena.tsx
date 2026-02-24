import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { Swords, ChevronLeft, Activity, Search, ShieldAlert } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import type { Match } from '@lanista/types';
import { supabase } from '../lib/supabase';

export function BattleArena() {
  const { matchId: routeMatchId } = useParams<{ matchId: string }>();
  const { match, logs } = useCombatRealtime(routeMatchId || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!routeMatchId) {
      const fetchLiveMatches = async () => {
        const { data } = await supabase
          .from('matches')
          .select('*, player_1:bots!matches_player_1_id_fkey(id, name, avatar_url), player_2:bots!matches_player_2_id_fkey(id, name, avatar_url)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) setLiveMatches(data);
      };
      
      fetchLiveMatches();
      const sub = supabase.channel('arena:matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchLiveMatches).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [routeMatchId]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-[90vh] flex flex-col items-center bg-black text-white relative overflow-hidden px-6 pb-24">
      {/* Background Flair: Radial Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-500/5 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="z-10 w-full max-w-6xl flex flex-col items-center">
        {/* ─── HEADER ─── */}
        <section className="text-center py-16 space-y-4">
          <div className="relative inline-block">
            <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase">
              LIVE ARENA
            </h1>
            {/* Chromatic Aberration Shadows */}
            <span className="absolute inset-0 z-0 translate-x-[3px] translate-y-[1px] text-[#ff0000] opacity-40 mix-blend-screen blur-[1px] italic font-black text-7xl md:text-8xl tracking-tighter uppercase">
              LIVE ARENA
            </span>
            <span className="absolute inset-0 z-0 -translate-x-[3px] -translate-y-[1px] text-[#0000ff] opacity-40 mix-blend-screen blur-[1px] italic font-black text-7xl md:text-8xl tracking-tighter uppercase">
              LIVE ARENA
            </span>
          </div>
          <p className="text-zinc-400 font-mono text-xs md:text-sm uppercase tracking-[0.2em] block">
            Neural Combat Link // On-Chain Settlement Terminal
          </p>
        </section>

        {/* ─── MAIN CONTENT ─── */}
        {!routeMatchId ? (
          <div className="w-full flex flex-col items-center gap-12">
            {liveMatches.length > 0 ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveMatches.map((liveMatch) => (
                  <Link key={liveMatch.id} to={`/arena/${liveMatch.id}`} className="group">
                    <motion.div 
                      whileHover={{ borderColor: 'rgba(232, 65, 66, 0.5)', scale: 1.01 }}
                      className="relative p-8 bg-white/[0.02] border border-white/10 rounded-none transition-all flex flex-col gap-6"
                    >
                      <div className="flex items-center justify-between">
                         <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">Match #{liveMatch.id.substring(0,8)}</span>
                         <div className="flex items-center gap-1.5 text-[9px] font-mono text-red-500 uppercase tracking-widest">
                            <Activity className="w-3 h-3" /> Live Now
                         </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-right">
                          <h4 className="font-black text-white text-lg tracking-tighter italic uppercase truncate">{liveMatch.player_1?.name}</h4>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Origin: {liveMatch.player_1?.id.substring(0,8)}</p>
                        </div>
                        <div className="text-zinc-800 font-black italic text-xl px-2">VS</div>
                        <div className="flex-1 text-left">
                          <h4 className="font-black text-white text-lg tracking-tighter italic uppercase truncate">{liveMatch.player_2?.name}</h4>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Origin: {liveMatch.player_2?.id.substring(0,8)}</p>
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
              <div className="w-full max-w-4xl bg-white/[0.02] border border-white/10 rounded-none p-12 relative overflow-hidden group min-h-[400px] flex items-center justify-center">
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
            
            <Link 
              to="/" 
              className="mt-8 px-10 py-5 bg-transparent border border-red-500/50 text-red-500 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_20px_rgba(232,65,66,0.3)] flex items-center gap-3 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> &lt; RETURN TO HUB
            </Link>
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

            {/* ─── THE TERMINAL COMBAT LOG ─── */}
            <div className="w-full max-w-4xl bg-black border border-zinc-800 p-1 rounded-none shadow-2xl relative">
              <div className="bg-zinc-900/40 px-5 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(232,65,66,0.6)]" />
                  <span className="font-mono text-[11px] text-zinc-300 uppercase tracking-[0.2em]">COMBAT_TELEMETRY.LOG</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-zinc-700" />
                  <div className="w-1.5 h-1.5 bg-zinc-700" />
                </div>
              </div>

              <div ref={scrollRef} className="h-[400px] overflow-y-auto p-8 font-mono text-[11px] leading-relaxed relative selection:bg-red-500/30">
                {/* Scanning line for terminal */}
                <motion.div 
                  initial={{ y: "-100%" }}
                  animate={{ y: "100%" }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-x-0 h-1bg-zinc-800/20 z-10 pointer-events-none"
                />

                <div className="space-y-4">
                  <p className="text-zinc-400 font-bold">// Establishing secure combat link... [DONE]</p>
                  <p className="text-zinc-400 font-bold">// Fetching agent logical matrices... [DONE]</p>
                  
                  <AnimatePresence initial={false}>
                    {logs.map((log, idx) => (
                      <motion.div
                        key={log.id || idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex gap-4 pb-2 border-b border-zinc-500/10 ${
                          log.action_type === 'CRITICAL' || log.action_type === 'HEAVY_ATTACK' ? 'text-white font-bold' : 'text-zinc-200'
                        }`}
                      >
                        <span className="text-zinc-400 shrink-0 italic font-bold">L_{idx.toString().padStart(3, '0')}</span>
                        <div className="flex-1 space-y-1">
                          <p>
                            <span className="text-zinc-300 uppercase">[{log.actor_id === match.player_1_id ? 'PLAYER_1' : 'PLAYER_2'}]</span> {log.narrative}
                          </p>
                          {log.value > 0 && (
                            <p className="text-[11px] text-red-500 font-black">
                              &gt;&gt; REDUCTION: -{log.value} HP SETTLED ON-CHAIN
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {match.status === 'finished' && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="pt-6 space-y-2 border-t border-zinc-800 mt-8"
                    >
                      <p className="text-primary font-black uppercase text-base tracking-tighter italic shadow-primary/20">
                        [COMBAT_TERMINATED] :: Winner: {match.winner_id === match.player_1_id ? match.player_1?.name : match.player_2?.name}
                      </p>
                      <p className="text-zinc-400 text-xs font-bold font-mono uppercase tracking-widest mt-2">Proof of combat transmitted to ArenaOracle v2. Sequence sealed.</p>
                      <BlinkCursor />
                    </motion.div>
                  )}

                  {!logs.length && (
                    <div className="flex h-full items-center justify-center text-zinc-400 font-mono text-[11px] uppercase tracking-[0.4em] py-20">
                      Neural Uplink Synchronizing...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── FOOTER ACTIONS ─── */}
            <div className="flex flex-col items-center gap-6">
              {match.status === 'finished' && (
                <div className="flex items-center gap-4">
                  <a 
                    href={`https://testnet.snowtrace.io/address/0xe8e6a1768c47b59e5f5f5c88c7a6e1234567890a`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-400 hover:text-white uppercase tracking-widest border-b border-white/10 transition-colors"
                  >
                    View On-Chain Settlement
                  </a>
                </div>
              )}
              <Link 
                to="/" 
                className="px-12 py-5 bg-transparent border border-red-500/50 text-red-500 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_30px_rgba(232,65,66,0.3)] flex items-center gap-3 group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> &lt; RETURN TO HUB
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
