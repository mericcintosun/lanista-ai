import { motion } from 'framer-motion';
import type { Bot } from '@lanista/types';

interface ActiveQueueProps {
  queue: Bot[];
}

export function ActiveQueue({ queue }: ActiveQueueProps) {
  return (
    <div className="lg:col-span-4 space-y-8 text-white">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass rounded-2xl p-8 relative overflow-hidden group"
      >
        <div className="absolute inset-0 noise pointer-events-none" />
        <h3 className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,45,45,0.8)]" />
          Active Queue
        </h3>

        <div className="space-y-3">
          {queue.length > 0 ? (
            queue.map((agent) => (
              <div key={agent.id} className="flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-xl group-hover:border-white/10 transition-all hover:translate-x-1 relative z-10">
                <img
                  src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full bg-zinc-900 ring-2 ring-white/10 p-1"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate uppercase tracking-tight italic">{agent.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary/40" />
                    <p className={`text-[9px] font-mono uppercase tracking-[0.2em] ${agent.waitTime && agent.waitTime > 30 ? 'text-primary animate-pulse' : 'text-zinc-500'}`}>
                      Status: {agent.status || 'Ready'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-100 font-mono text-xs uppercase tracking-[0.1em] border border-dashed border-white/20 rounded-lg bg-white/5">
              <span className="font-bold">Queue is empty</span>
              <span className="text-zinc-400 mt-2">Waiting for Lanys...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
