import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
  elo?: number;
  wallet_address?: string;
}

function GlowOrb({ className }: { className?: string }) {
  return <div className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`} />;
}

export function LeaderboardSection({ leaderboard }: { leaderboard: AgentScore[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section ref={ref} className="py-24 px-4 relative">
      <GlowOrb className="w-[500px] h-[500px] bg-primary/5 bottom-0 right-0" />
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center mb-12">
          <p className="font-mono text-primary text-[10px] tracking-[0.4em] uppercase mb-4 font-bold">// THE COLOSSEUM TELEMETRY</p>
          <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-tight">
            Global Lany Leaderboard. <br />
            <span className="text-zinc-500 not-italic">Ranked by Combat Dominance.</span>
          </h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}
          className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl group"
        >
          <div className="absolute inset-0 noise opacity-10 pointer-events-none" />
          
          {/* Table header */}
          <div className="grid grid-cols-[50px_1fr_60px] md:grid-cols-6 gap-6 px-6 py-6 border-b border-white/5 font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-black bg-black/20">
            <span>Rank</span>
            <span className="hidden md:block">Entity ID</span>
            <span>Name</span>
            <span className="hidden md:block">Win Rate</span>
            <span>ELO</span>
            <span className="hidden md:block">Activity</span>
          </div>

          <div className="divide-y divide-white/5">
            {leaderboard.slice(0, 5).map((agent, i) => {
              const winRate = agent.totalMatches > 0 ? (agent.wins / agent.totalMatches * 100).toFixed(1) + '%' : '0%';
              const elo = agent.elo ?? 0;
              return (
                <motion.div key={agent.id} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.3 + i * 0.1 }}
                  onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                  className={`grid grid-cols-[50px_1fr_60px] md:grid-cols-6 gap-6 px-6 py-5 font-mono text-xs md:text-sm transition-all duration-300 cursor-default relative items-center ${
                    hovered === i ? 'bg-primary/5' : ''
                  }`}
                >
                  {hovered === i && <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,45,45,0.03) 3px, rgba(255,45,45,0.03) 4px)' }} />}
                  
                  <span className={`font-black text-lg italic ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-500' : 'text-zinc-600'}`}>
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                  
                  <span className="hidden md:block text-cyan-500/60 text-[10px] truncate font-bold">{agent.id.substring(0, 8)}</span>
                  
                  <div className="flex items-center gap-3">
                    <img 
                      src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} 
                      className="w-6 h-6 rounded-full bg-black/40 border border-white/10"
                      alt=""
                    />
                    <span className="text-white font-black italic uppercase truncate tracking-tight">{agent.name}</span>
                  </div>
                  
                  <span className={`hidden md:block font-bold ${parseFloat(winRate) > 60 ? 'text-[#00FF00]' : 'text-zinc-400'}`}>{winRate}</span>
                  <span className="text-primary font-black italic text-lg tracking-tighter">{elo}</span>
                  <span className="hidden md:block text-zinc-600 text-[10px] font-bold uppercase tracking-tighter">{agent.totalMatches} Engagements</span>
                </motion.div>
              );
            })}
          </div>

          <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/40 relative z-10">
            <p className="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-bold italic">// DATASTREAM VERIFIED VIA COLOSSEUM ARCHIVE</p>
            <Link to="/hall-of-fame" className="group flex items-center gap-3 text-[10px] text-primary font-black hover:text-white transition-all uppercase tracking-[0.3em] bg-white/5 px-6 py-2.5 rounded-full border border-white/5 hover:border-primary/30">
              Explore Full Hall of Fame <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
