import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GladiatorCard } from './GladiatorCard';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { Sword, Loader2, Sparkles } from 'lucide-react';
import type { Match, CombatLog } from '@lanista/types';

export function BattleArena() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const { match, logs, setMatch, setLogs } = useCombatRealtime(matchId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const startCombat = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/combat/start', { method: 'POST' });
      const data = await res.json();
      setMatch(data.match);
      setMatchId(data.match.id);
      setLogs([]);
    } catch (err) {
      console.error(err);
      alert('Backend is not running!');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Background dark brutalist styling */}
      <div className="absolute inset-0 z-0 bg-neutral-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="z-10 w-full max-w-5xl flex flex-col items-center">
        {/* Header */}
        <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 mb-12 glitch-effect select-none" data-text="LANISTA">
          LANISTA
        </h1>

        {!match ? (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startCombat}
            className="px-8 py-4 bg-primary text-white font-bold tracking-widest uppercase text-sm rounded-full shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] flex items-center gap-3 transition-colors hover:bg-red-600"
          >
            <Sword className="w-5 h-5" />
            Enter the Arena
          </motion.button>
        ) : (
          <div className="w-full flex flex-col items-center gap-12">
            {/* Arena View */}
            <div className="flex w-full items-center justify-between mt-8 relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-neutral-800 text-9xl font-black italic select-none">VS</div>
              
              <GladiatorCard gladiator={match.gladiator1} />
              
              <div className="relative">
                {match.status === 'FINISHED' ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-primary text-primary px-8 py-4 font-black text-3xl rotating uppercase skew-x-[-10deg] shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-black/80 backdrop-blur-md"
                  >
                    BATTLE OVER
                  </motion.div>
                ) : (
                  <Loader2 className="w-12 h-12 text-primary animate-spin opacity-50" />
                )}
              </div>

              <GladiatorCard gladiator={match.gladiator2} isRight />
            </div>

            {/* Combat Log Stream Container */}
            <div className="w-full max-w-2xl bg-surface/50 border border-neutral-800/80 rounded-2xl p-6 mt-12 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <h3 className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-4 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Live Stream
              </h3>
              
              <div ref={scrollRef} className="h-64 overflow-y-auto pr-4 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      className={`text-sm font-mono py-2 border-b border-neutral-800/50 flex justify-between items-start leading-relaxed ${
                         log.action_type === 'DIE' ? 'text-primary font-bold' : 'text-neutral-300'
                      }`}
                    >
                      <span>{log.description}</span>
                      {log.damage > 0 && (
                        <span className="text-primary font-black ml-4 shrink-0 bg-primary/10 px-2 rounded">-{log.damage}</span>
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
            
            {match.status === 'FINISHED' && (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={startCombat}
                className="mt-6 px-8 py-3 bg-neutral-900 border border-neutral-800 text-white font-bold tracking-widest uppercase text-xs rounded hover:bg-neutral-800 transition-colors"
              >
                Start New Match
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
