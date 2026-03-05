import { Shield, ExternalLink, Copy } from 'lucide-react';

interface ContractStatsProps {
  contractAddress: string;
  explorerUrl: string;
  onChainCount: number;
  totalCount: number;
  onCopy: () => void;
  copied: boolean;
}

export function ContractStats({ 
  contractAddress, 
  explorerUrl, 
  onChainCount, 
  totalCount, 
  onCopy, 
  copied 
}: ContractStatsProps) {
  return (
    <div className="glass rounded-3xl p-1 relative overflow-hidden group">
      <div className="absolute inset-0 noise pointer-events-none" />
      <div className="p-10 relative z-10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          <div className="space-y-6 flex-1 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-500" />
              <h2 className="font-mono text-[10px] sm:text-xs uppercase text-zinc-400 tracking-widest">Avalanche Smart Contract</h2>
            </div>

            <div className="group/addr relative">
              <p className="font-mono text-base sm:text-lg md:text-2xl text-white break-all tracking-tight leading-tight">
                {contractAddress}
              </p>
              <button
                onClick={onCopy}
                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 lg:group-hover/addr:opacity-100 transition-all p-2 hover:text-red-500"
              >
                {copied ? <span className="text-[10px] font-black text-[#00FF00]">COPIED</span> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-center lg:justify-start">
              <a
                href={`${explorerUrl}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 border border-red-500/50 text-red-500 font-mono text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_20px_rgba(232,65,66,0.2)]"
              >
                <ExternalLink className="w-4 h-4" /> System Audit Log
              </a>
            </div>
          </div>

          <div className="flex flex-row sm:flex-row gap-8 sm:gap-16 w-full lg:w-auto justify-center lg:justify-end border-t lg:border-t-0 border-white/5 pt-8 lg:pt-0">
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tighter text-red-500 leading-none">
                {onChainCount}
              </div>
              <div className="text-[9px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-widest mt-2 font-bold whitespace-nowrap">Verified Logs</div>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tighter text-white leading-none">
                {totalCount}
              </div>
              <div className="text-[9px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-widest mt-2 font-bold whitespace-nowrap">Total Records</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
