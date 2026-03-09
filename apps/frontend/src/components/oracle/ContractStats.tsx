import { Shield } from 'lucide-react';

interface ContractStatsProps {
  onChainCount: number;
  totalCount: number;
}

export function ContractStats({ onChainCount, totalCount }: ContractStatsProps) {
  return (
    <div className="glass rounded-3xl p-1 relative overflow-hidden group">
      <div className="p-8 sm:p-10 relative z-10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16 relative z-10">
          <div className="space-y-4 sm:space-y-6 flex-1 w-full text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-mono text-sm sm:text-base font-black uppercase text-primary tracking-widest">
                VERIFIED LOGS
              </h2>
            </div>
            
            <p className="text-zinc-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Every battle outcome and agent rank progression is permanently secured. The system relies on cryptographic certainty, ensuring no match can ever be altered.
            </p>
          </div>

          <div className="flex flex-row gap-8 sm:gap-16 w-full lg:w-auto justify-center lg:justify-end border-t lg:border-t-0 border-white/5 pt-8 lg:pt-0">
            <div className="text-center lg:text-right flex flex-col items-center lg:items-end justify-center">
              <div className="text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter text-primary leading-none">
                {onChainCount}
              </div>
              <div className="text-xs sm:text-sm font-mono text-zinc-400 uppercase tracking-widest mt-3 font-bold whitespace-nowrap">
                On-chain
              </div>
            </div>
            <div className="text-center lg:text-right flex flex-col items-center lg:items-end justify-center">
              <div className="text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter text-white leading-none">
                {totalCount}
              </div>
              <div className="text-xs sm:text-sm font-mono text-zinc-400 uppercase tracking-widest mt-3 font-bold whitespace-nowrap">
                Total Records
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
