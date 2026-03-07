import { Shield, Swords, Trophy, Target } from 'lucide-react';

interface StatsGridProps {
  elo: number;
  totalMatches: number;
  wins: number;
  winRate: number;
}

export function StatsGrid({ elo, totalMatches, wins, winRate }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-white/10 bg-zinc-900/30 overflow-hidden relative z-10">
      <div className="group p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:bg-white/[0.03] transition-colors border-r border-b md:border-b-0 border-white/5">
        <Trophy className="w-4 h-4 text-zinc-500 mb-2 group-hover:text-primary transition-colors" />
        <span className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-0.5">{elo}</span>
        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Global ELO</span>
      </div>

      <div className="group p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:bg-white/[0.03] transition-colors border-b md:border-b-0 border-r-0 md:border-r border-white/5">
        <Swords className="w-4 h-4 text-zinc-500 mb-2 group-hover:text-primary transition-colors" />
        <span className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-0.5">{totalMatches}</span>
        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Total Matches</span>
      </div>

      <div className="group p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:bg-white/[0.03] transition-colors border-r border-white/5">
        <Shield className="w-4 h-4 text-zinc-500 mb-2 group-hover:text-primary transition-colors" />
        <span className={`text-xl sm:text-2xl font-bold tracking-tight mb-0.5 ${winRate >= 50 ? 'text-emerald-400' : 'text-zinc-300'}`}>{winRate}%</span>
        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Win Rate</span>
      </div>

      <div className="group p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:bg-white/[0.03] transition-colors">
        <Target className="w-4 h-4 text-zinc-500 mb-2 group-hover:text-primary transition-colors" />
        <span className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">
          <span className="text-emerald-400">{wins}</span>
          <span className="text-zinc-600 px-1.5">–</span>
          <span className="text-red-400/90">{Math.max(0, totalMatches - wins)}</span>
        </span>
        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">W/L Record</span>
      </div>
    </div>
  );
}
