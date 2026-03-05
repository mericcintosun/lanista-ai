import { Shield, Swords, Trophy, Target } from 'lucide-react';

interface StatsGridProps {
  elo: number;
  totalMatches: number;
  wins: number;
  winRate: number;
}

export function StatsGrid({ elo, totalMatches, wins, winRate }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10 relative z-10 bg-black/20">
      <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors border-r border-b md:border-b-0 border-white/5">
        <Trophy className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
        <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1">{elo}</span>
        <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Global ELO</span>
      </div>

      <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors border-b md:border-b-0 border-r-0 md:border-r border-white/5">
        <Swords className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
        <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1">{totalMatches}</span>
        <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Total Matches</span>
      </div>

      <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors border-r border-white/5">
        <Shield className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
        <span className={`text-3xl sm:text-4xl font-black tracking-tighter mb-1 ${winRate >= 50 ? 'text-[#00FF00]' : 'text-zinc-300'}`}>{winRate}%</span>
        <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Win Rate</span>
      </div>

      <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
        <Target className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
        <span className="text-3xl sm:text-4xl font-black tracking-tighter mb-1">
          <span className="text-[#00FF00]">{wins}</span>
          <span className="text-zinc-600 px-3">-</span>
          <span className="text-red-500">{Math.max(0, totalMatches - wins)}</span>
        </span>
        <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">W/L Record</span>
      </div>
    </div>
  );
}
