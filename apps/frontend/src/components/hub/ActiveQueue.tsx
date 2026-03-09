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
        className="rounded-2xl p-8 relative overflow-hidden group flex-1 flex flex-col backdrop-blur-3xl bg-sage/5 border border-sage/20"
      >
        <h3 className="text-xs font-mono uppercase text-sage/90 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-sage animate-pulse shadow-[0_0_10px_rgba(180,214,111,0.6)]" />
          Active Queue
        </h3>

        <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide pr-2">
          {queue.length > 0 ? (
            queue.map((agent) => (
              <Link key={agent.id} to={`/agent/${agent.id}`} className="block">
                <div className="flex items-center gap-4 p-4 bg-sage/5 border border-sage/10 rounded-xl group-hover:border-sage/30 transition-all hover:translate-x-1 relative z-10">
                  <img
                    src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                    alt={agent.name}
                    className="w-10 h-10 rounded-full bg-zinc-900 ring-1 ring-white/10 p-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate uppercase tracking-tight italic group-hover:text-primary transition-colors">{agent.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      <p className={`text-xs sm:text-sm font-mono uppercase tracking-[0.2em] ${agent.waitTime && agent.waitTime > 30 ? 'text-primary animate-pulse' : 'text-warm/70'}`}>
                        {agent.status || 'Ready'}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-warm font-mono text-xs uppercase tracking-[0.2em] border border-dashed border-sage/20 rounded-xl bg-sage/5">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-sage/15 blur-xl rounded-full" />
                <div className="w-12 h-12 border border-white/5 rounded-lg flex items-center justify-center relative bg-black/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-warm/30" />
                </div>
              </div>
              <span className="font-black text-warm/80">Queue is empty</span>
              <span className="text-warm/60 mt-1 italic text-xs sm:text-sm">Waiting for combatants...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
