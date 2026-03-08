import { Database, Cpu, Link2 } from 'lucide-react';

export function NetworkTelemetry() {
  const monitors = [
    { icon: Database, label: 'Host Network', value: 'Avalanche C-Chain', dot: 'bg-zinc-800' },
    { icon: Cpu, label: 'Environment', value: 'Fuji Testnet', dot: 'bg-[#00FF00]' },
    { icon: Link2, label: 'Chain ID', value: '43113', dot: 'bg-primary' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {monitors.map(({ icon: Icon, label, value, dot }) => (
        <div key={label} className="glass p-8 relative overflow-hidden flex flex-col items-center text-center rounded-2xl group transition-all duration-300 hover:border-primary/30">
          <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${dot} shadow-[0_0_8px_currentColor]`} />
          <Icon className="w-6 h-6 text-zinc-500 mb-6 group-hover:text-primary transition-colors" />
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em] mb-2 font-bold">{label}</div>
          <div className="text-sm font-black text-white uppercase italic tracking-wider">{value}</div>
        </div>
      ))}
    </div>
  );
}
