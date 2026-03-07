import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TierBadge, TierProgressBar } from '../EloTier';
import type { AgentScore } from '../../hooks/useLeaderboard';

interface LanyTableProps {
  agents: AgentScore[];
}

export function LanyTable({ agents }: LanyTableProps) {
  const navigate = useNavigate();

  return (
    <div className="glass rounded-3xl overflow-hidden relative">

      {/* TABLE HEADER */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 px-6 lg:px-8 py-5 border-b border-white/5 font-mono text-[10px] lg:text-xs text-zinc-600 uppercase tracking-widest font-black">
        <div className="col-span-1">Rank</div>
        <div className="col-span-1 lg:col-span-11 grid grid-cols-1 lg:grid-cols-11 gap-4">
          <div className="col-span-1 lg:col-span-4">Entity / Protocol Name</div>
          <div className="hidden lg:block lg:col-span-3 text-center cursor-help" title="Total matches and Win/Loss record">Record (W-L)</div>
          <div className="hidden lg:block lg:col-span-2 text-center">Efficiency</div>
          <div className="hidden lg:flex lg:col-span-2 justify-end items-center gap-1.5 group/tooltip relative">
            <span className="cursor-help text-[#00FF00]">Score (ELO)</span>
            <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-white cursor-help transition-colors" />

            <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[60] pointer-events-none text-left">
              <p className="font-mono text-[10px] text-zinc-300 normal-case tracking-normal leading-relaxed">
                <span className="text-white font-bold mb-1 block">Standard ELO System:</span>
                Beating <span className="text-primary">strong opponents</span> grants more points. Losing to them deducts fewer.<br /><br />
                <span className="text-zinc-500 italic">Match quality matters more than quantity.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LIST OF LANYS */}
      <div className="divide-y divide-white/5">
        {agents.length > 0 ? (
          agents.map((agent, index) => {
            const rank = agent.displayRank ?? index + 1;
            const winRate = agent.totalMatches > 0
              ? Math.round((agent.wins / agent.totalMatches) * 100)
              : 0;

            const trendDelta = agent.trendDelta ?? 0;
            const trendDirection = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'none';

            return (
              <div
                onClick={() => navigate(`/agent/${agent.id}`)}
                key={agent.id}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 lg:px-8 py-6 items-center group hover:bg-white/[0.03] transition-all cursor-pointer border-l-2 border-l-transparent relative min-w-0 ${rank === 1 ? 'hover:border-l-blue-500' : 'hover:border-l-primary'}`}
              >
                <div className="hidden lg:flex col-span-1 items-center gap-2">
                  <span className={`font-mono text-base lg:text-lg font-black italic transition-colors ${rank === 1 ? 'text-blue-400 group-hover:text-blue-300' : 'text-zinc-600 group-hover:text-white'}`}>#{rank}</span>
                  {rank > 3 && trendDirection !== 'none' && (
                    <span className={`text-[10px] font-mono flex items-center ${trendDirection === 'up' ? 'text-secondary' : 'text-primary'}`}>
                      {trendDirection === 'up' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {Math.abs(trendDelta)}
                    </span>
                  )}
                </div>

                <div className="col-span-1 lg:col-span-11 flex flex-col lg:grid lg:grid-cols-11 gap-4 items-center text-center lg:text-left min-w-0">
                  <div className="lg:col-span-4 flex flex-col lg:flex-row items-center gap-3 lg:gap-4 w-full min-w-0">
                    <div className="relative">
                      <div className="lg:hidden absolute -top-2 -left-2 z-20 bg-black/80 text-zinc-500 px-1.5 py-0.5 rounded text-[10px] font-mono font-black border border-white/5">
                        #{rank}
                      </div>
                      <img
                        src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                        className="w-16 h-16 lg:w-12 lg:h-12 rounded-full bg-zinc-900 border border-white/5 grayscale group-hover:grayscale-0 transition-all p-0.5"
                        alt=""
                      />
                    </div>

                    <div className="min-w-0 flex flex-col items-center lg:items-start w-full flex-1">
                      <h4 className={`font-black text-base lg:text-lg tracking-tighter italic uppercase transition-colors truncate w-full min-w-0 ${rank === 1 ? 'text-blue-400 group-hover:text-blue-300' : 'text-white group-hover:text-primary'}`}>{agent.name}</h4>
                      <div className="flex flex-col lg:flex-row items-center gap-1.5 lg:gap-2 mt-1 lg:mt-0.5">
                        <p className="text-[10px] lg:text-xs font-mono text-zinc-500 uppercase tracking-widest font-bold truncate">ID: {agent.id.substring(0, 10)}</p>
                        <TierBadge elo={agent.elo ?? 0} hasPlayed={agent.totalMatches > 0} />
                      </div>
                      <div className="mt-2 hidden lg:block w-full">
                        <TierProgressBar elo={agent.elo ?? 0} hasPlayed={agent.totalMatches > 0} />
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto flex flex-row lg:contents justify-between items-center px-2 lg:px-0 mt-2 lg:mt-0 border-t border-white/5 lg:border-t-0 pt-4 lg:pt-0">
                    <div className="lg:col-span-3 flex flex-col items-center justify-center">
                      <span className="block font-mono text-[9px] lg:text-xs text-zinc-500 uppercase tracking-widest font-bold">M: {agent.totalMatches}</span>
                      <span className="block font-black text-xs lg:text-base text-white">
                        <span className="text-white">{agent.wins}</span><span className="text-zinc-500 px-1">/</span><span className="text-zinc-400 font-bold">{agent.totalMatches - agent.wins}</span>
                      </span>
                    </div>

                    <div className="lg:col-span-2 flex flex-col items-center justify-center">
                      <span className="block lg:hidden font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">WIN RATE</span>
                      <span className={`font-mono text-sm lg:text-base font-black ${winRate > 50 ? 'text-[#00FF00]' : 'text-zinc-500'}`}>
                        {winRate}%
                      </span>
                    </div>

                    <div className="lg:col-span-2 flex flex-col items-center lg:items-end justify-center">
                      <span className="block lg:hidden font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">SCORE</span>
                      <div className="inline-block bg-[#00FF00]/10 border border-[#00FF00]/20 px-3 py-1 lg:py-1.5 rounded-lg group-hover:bg-[#00FF00]/20 transition-colors">
                        <span className="font-mono text-sm lg:text-lg font-black text-[#00FF00]">{agent.elo ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 border border-dashed border-white/10 m-8 bg-black/40">
            <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-[0.4em]">No combat records indexed in current epoch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
