import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GladiatorCard } from './GladiatorCard';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { Sparkles, Activity, Swords } from 'lucide-react';
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="z-10 w-full max-w-5xl flex flex-col items-center">
        {!routeMatchId ? (
          <div className="w-full space-y-6">
            <h1 className="text-4xl font-black text-center italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 mb-8 select-none">
              LIVE ARENA
            </h1>
            <div className="space-y-4">
              {liveMatches.length > 0 ? (
                liveMatches.map((liveMatch) => (
                  <Link key={liveMatch.id} to={`/arena/${liveMatch.id}`} className="block group">
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-6 rounded-xl bg-black/40 border border-neutral-800 group-hover:border-primary/50 transition-colors relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
                      
                      <div className="flex items-center gap-8 w-full justify-center">
                        <div className="flex items-center gap-4 text-right">
                          <h4 className="font-bold text-white text-lg">{liveMatch.player_1?.name}</h4>
                          <img 
                            src={liveMatch.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${liveMatch.player_1?.name || 'p1'}`} 
                            alt="" 
                            className="w-12 h-12 rounded-full bg-neutral-900 ring-2 ring-neutral-800" 
                          />
                        </div>
                        
                        <div className="text-primary font-black italic text-2xl px-6 opacity-30">VS</div>

                        <div className="flex items-center gap-4">
                          <img 
                            src={liveMatch.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${liveMatch.player_2?.name || 'p2'}`} 
                            alt="" 
                            className="w-12 h-12 rounded-full bg-neutral-900 ring-2 ring-neutral-800" 
                          />
                          <h4 className="font-bold text-white text-lg">{liveMatch.player_2?.name}</h4>
                        </div>
                      </div>

                      <div className="absolute right-6 flex items-center gap-2 text-xs font-mono text-primary animate-pulse">
                        <Swords className="w-4 h-4" /> Spectate
                      </div>
                    </motion.div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-12 text-neutral-600 font-mono text-sm border border-dashed border-neutral-800 rounded-xl">
                  No active battles currently in the arena. Waiting for agents...
                </div>
              )}
            </div>
            
            <div className="text-center">
              <Link to="/" className="inline-block mt-4 px-8 py-4 bg-primary text-white font-bold tracking-widest uppercase text-sm rounded-full shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] transition-colors hover:bg-red-600">
                Return to Hub
              </Link>
            </div>
          </div>
        ) : !match ? (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
             <div className="w-12 h-12 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
             </div>
             <p className="font-mono text-sm text-neutral-500 animate-pulse">Establishing connection to arena...</p>
          </div>
        ) : match.status === 'aborted' ? (
          <div className="flex flex-col items-center justify-center gap-6 text-center">
             <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
               <span className="text-red-500 text-2xl font-black">!</span>
             </div>
             <div>
               <h2 className="text-2xl font-black italic tracking-tighter text-white mb-2">SIGNAL LOST ⚡</h2>
               <p className="font-mono text-sm text-neutral-400 max-w-sm">Arena connection dropped. Either the agents failed to respond, or the match was forcefully aborted by the referee.</p>
             </div>
             <Link to="/" className="inline-block mt-4 px-6 py-3 bg-neutral-900 border border-neutral-800 text-white font-bold tracking-widest uppercase text-xs rounded transition-colors hover:bg-neutral-800">
               Return to Hub
             </Link>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-12 mt-8">
            {/* Arena View */}
            <div className="flex w-full items-center justify-between mt-8 relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-neutral-800 text-9xl font-black italic select-none">VS</div>
              
              {match.player_1 && <GladiatorCard bot={match.player_1} />}
              
              <div className="relative">
                {match.status === 'finished' ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-primary text-primary px-8 py-4 font-black text-3xl rotating uppercase skew-x-[-10deg] shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-black/80 backdrop-blur-md whitespace-nowrap text-center flex flex-col gap-2"
                  >
                    <span>BATTLE OVER</span>
                    <span className="text-sm font-bold tracking-widest text-white mt-1">
                       {match.winner_id === match.player_1_id ? match.player_1?.name : 
                        match.winner_id === match.player_2_id ? match.player_2?.name : 'UNKNOWN'} WINS!
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="w-12 h-12 text-primary animate-pulse opacity-80" />
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Live</span>
                  </div>
                )}
              </div>

              {match.player_2 && <GladiatorCard bot={match.player_2} isRight />}
            </div>

            {/* Combat Log Stream Container */}
            <div className="w-full max-w-2xl bg-surface/50 border border-neutral-800/80 rounded-2xl p-6 mt-12 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <h3 className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-4 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Live Stream
              </h3>
              
              <div ref={scrollRef} className="h-64 overflow-y-auto pr-4 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                <AnimatePresence initial={false}>
                  {logs.map((log, idx) => (
                    <motion.div
                      key={log.id || idx}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      className={`text-sm font-mono py-2 border-b border-neutral-800/50 flex justify-between items-start leading-relaxed ${
                         log.action_type === 'CRITICAL' ? 'text-primary font-bold' : 
                         log.action_type === 'DEFEND' ? 'text-blue-400' : 'text-neutral-300'
                      }`}
                    >
                      <span className="flex-1">
                        {log.action_type === 'DEFEND' ? '🛡️ ' : '⚔️ '}
                        {log.narrative}
                      </span>
                      {log.value > 0 && (
                        <span className="text-primary font-black ml-4 shrink-0 bg-primary/10 px-2 rounded">-{log.value}</span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!logs.length && (
                  <div className="flex h-full items-center justify-center text-neutral-600 font-mono text-sm opacity-50">
                    Awaiting AI synchronization...
                  </div>
                )}
              </div>
            </div>
            
            {match.status === 'finished' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Link to="/" className="px-8 py-3 bg-neutral-900 border border-neutral-800 text-white font-bold tracking-widest uppercase text-xs rounded hover:bg-neutral-800 transition-colors">
                  Return to Hub
                </Link>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
