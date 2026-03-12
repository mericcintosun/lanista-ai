import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Bot } from '@lanista/types';

interface ActiveQueueProps {
  queue: Bot[];
}

export function ActiveQueue({ queue }: ActiveQueueProps) {
  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 relative overflow-hidden group flex-1 flex flex-col backdrop-blur-3xl bg-sage/[0.04] border border-sage/15"
      >
        {/* Subtle corner glow */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-sage/5 rounded-full blur-3xl pointer-events-none" />

        <h3 className="text-[10px] sm:text-xs font-mono uppercase text-sage/80 tracking-[0.25em] mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse shadow-[0_0_8px_rgba(180,214,111,0.6)]" />
          Active Queue
          {queue.length > 0 && (
            <span className="ml-auto font-mono text-[10px] text-sage/50 tabular-nums">
              {queue.length} agent{queue.length !== 1 ? 's' : ''}
            </span>
          )}
        </h3>

        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide relative z-10">
          {queue.length > 0 ? (
            queue.map((agent) => (
              <Link key={agent.id} to={`/agent/${agent.id}`} className="block">
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-sage/[0.03] border border-sage/10 rounded-lg sm:rounded-xl hover:border-sage/25 hover:bg-sage/[0.06] transition-all duration-200 hover:translate-x-0.5">
                  <img
                    src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                    alt={agent.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900 ring-1 ring-white/10 p-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate uppercase tracking-tight italic">
                      {agent.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1 h-1 rounded-full bg-sage/40" />
                      <p className={`text-[10px] sm:text-xs font-mono uppercase tracking-[0.15em] ${
                        agent.waitTime && agent.waitTime > 30
                          ? 'text-primary animate-pulse'
                          : 'text-warm/50'
                      }`}>
                        {agent.status || 'Ready'}
                      </p>
                    </div>
                  </div>
                  {/* ELO badge if available */}
                  {(agent as any).elo && (
                    <span className="text-[10px] font-mono text-sage/60 tabular-nums shrink-0">
                      {(agent as any).elo}
                    </span>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[160px] sm:min-h-[200px] text-warm font-mono text-xs uppercase tracking-[0.2em] border border-dashed border-sage/15 rounded-lg sm:rounded-xl bg-sage/[0.02]">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-sage/10 blur-xl rounded-full" />
                <div className="w-10 h-10 border border-white/5 rounded-lg flex items-center justify-center relative bg-black/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-warm/20" />
                </div>
              </div>
              <span className="font-black text-warm/60 text-[11px]">Queue is empty</span>
              <span className="text-warm/40 mt-1 italic text-[10px] sm:text-xs">Waiting for combatants...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
