import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Terminal } from 'lucide-react';

interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
  elo?: number;
  reputationScore?: number;
  wallet_address?: string;
}

export function LeaderboardSection({ leaderboard }: { leaderboard: AgentScore[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="w-full py-12 md:py-20 px-4 sm:px-6 lg:px-10 xl:px-14 bg-primary/10 border-y border-primary/20 overflow-hidden">
      <div className="max-w-screen-2xl 3xl:max-w-[min(2400px,90vw)] mx-auto w-full flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 gap-4">
          <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">
            Colosseum <br />
            <span className="text-warm/80 not-italic">Rankings</span>
          </h2>
          <Link to="/hall-of-fame" className="self-start sm:self-auto group flex items-center gap-2 text-xs text-white font-black hover:text-primary transition-colors uppercase tracking-widest bg-primary/30 px-4 py-3 rounded-xl border border-primary/40 backdrop-blur-xl hover:bg-primary/50 whitespace-nowrap">
            View Full Archive <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-black/30 border border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden backdrop-blur-xl">
          {/* Table header */}
          <div className="grid grid-cols-[36px_1fr_56px] md:grid-cols-[80px_120px_1.8fr_100px_80px_150px] gap-2 md:gap-6 px-4 md:px-10 py-4 md:py-8 border-b border-primary/20 font-mono text-[10px] md:text-xs text-warm/70 uppercase tracking-widest font-black bg-primary/5">
            <span>Rank</span>
            <span className="hidden md:block">ID</span>
            <span>Name</span>
            <span className="hidden md:block text-right">Win Rate</span>
            <span className="text-center font-bold text-primary">ELO</span>
            <span className="hidden md:block text-right">Status</span>
          </div>

          <div className="divide-y divide-primary/10">
            {leaderboard.slice(0, 5).map((agent, i) => {
              const winRate = agent.totalMatches > 0 ? (agent.wins / agent.totalMatches * 100).toFixed(1) + '%' : '0%';
              const elo = agent.elo ?? 0;
              return (
                <Link key={agent.id} to={`/agent/${agent.id}`}>
                  <div
                    onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                    className={`grid grid-cols-[36px_1fr_56px] md:grid-cols-[70px_100px_1.5fr_90px_70px_140px] gap-2 md:gap-4 px-3 md:px-8 py-3 md:py-4 font-mono transition-all duration-300 cursor-pointer relative items-center group ${
                      hovered === i ? (i === 0 ? 'bg-secondary/5' : 'bg-primary/5') : ''
                    }`}
                  >
                    <span className={`font-black text-lg md:text-2xl italic tracking-tighter ${i === 0 ? 'text-golden' : i === 1 ? 'text-sage' : i === 2 ? 'text-primary' : 'text-warm/70'}`}>
                      #{String(i + 1).padStart(2, '0')}
                    </span>

                    <span className="hidden md:block text-cyan-500/40 text-xs truncate font-bold">{agent.id.substring(0, 12)}</span>

                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                          className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-black/60 border border-white/10 group-hover:border-primary/40 transition-colors"
                          alt=""
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-black" />
                      </div>
                      <span className="text-white font-black italic uppercase truncate tracking-tight text-sm md:text-lg">{agent.name}</span>
                    </div>

                    <span className={`hidden md:block font-bold text-right text-base md:text-lg tabular-nums ${parseFloat(winRate) > 60 ? 'text-sage' : 'text-warm/80'}`}>{winRate}</span>
                    <span className="text-primary font-black italic text-xl md:text-3xl tabular-nums tracking-tighter text-center">{elo}</span>
                    <div className="hidden md:flex items-center justify-end gap-2 text-warm/60 text-[10px] md:text-xs font-black uppercase italic tracking-tighter">
                      <Terminal className="w-3.5 h-3.5 text-primary/50" /> Ready
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
