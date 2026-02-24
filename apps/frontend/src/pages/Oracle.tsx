import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink, Cpu, Zap, Link2, Database, Copy } from 'lucide-react';

const ORACLE_CONTRACT = '0xAF470Ae9FE071451E5CC420fb7893326D66c7D12';
const FUJI_EXPLORER = 'https://testnet.snowtrace.io';

interface OnChainMatch {
  id: string;
  tx_hash: string | null;
  created_at: string;
  player_1: { name: string; avatar_url: string; wallet_address?: string };
  player_2: { name: string; avatar_url: string; wallet_address?: string };
  winner_id: string;
  player_1_id: string;
  player_2_id: string;
}

export default function Oracle() {
  const [matches, setMatches] = useState<OnChainMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/oracle/matches')
      .then(r => r.json())
      .then(data => {
        if (data.matches) setMatches(data.matches);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(ORACLE_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onChainCount = matches.filter(m => m.tx_hash && !m.tx_hash.startsWith('{')).length;
  const totalCount = matches.length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-16 pb-24 px-6 bg-black text-white selection:bg-red-500/30">

      {/* ─── HEADER ─── */}
      <section className="text-center space-y-6 pt-12">
        <div className="relative inline-block">
          <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter text-white select-none relative z-10 uppercase">
            THE ORACLE
          </h1>
          {/* Chromatic Aberration Shadows */}
          <span className="absolute inset-0 z-0 translate-x-[3px] translate-y-[1px] text-[#ff0000] opacity-40 mix-blend-screen blur-[1px] italic font-black text-7xl md:text-8xl tracking-tighter uppercase">
            THE ORACLE
          </span>
          <span className="absolute inset-0 z-0 -translate-x-[3px] -translate-y-[1px] text-[#0000ff] opacity-40 mix-blend-screen blur-[1px] italic font-black text-7xl md:text-8xl tracking-tighter uppercase">
            THE ORACLE
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-zinc-300 font-mono text-sm md:text-base max-w-xl mx-auto leading-relaxed uppercase tracking-wider">
            Verified log of all combat resolutions. <br />
            Secured by core system validation, immutable forever.
          </p>

          <div className="flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
            <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-black">
              [ SYSTEM SYNC: SECURE ]
            </span>
          </div>
        </div>
      </section>

      {/* ─── SMART CONTRACT HUB (SERVER CONSOLE LOOK) ─── */}
      <div className="bg-white/[0.02] border border-white/10 rounded-none p-10 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-500" />
              <h2 className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Avalanche Smart Contract</h2>
            </div>

            <div className="group/addr relative">
              <p className="font-mono text-lg md:text-2xl text-white break-all tracking-tight leading-none">
                {ORACLE_CONTRACT}
              </p>
              <button
                onClick={handleCopy}
                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/addr:opacity-100 transition-all p-2 hover:text-red-500"
              >
                {copied ? <span className="text-[10px] font-black text-[#00FF00]">COPIED</span> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-4">
              <a
                href={`${FUJI_EXPLORER}/address/${ORACLE_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 border border-red-500/50 text-red-500 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_20px_rgba(232,65,66,0.2)]"
              >
                <ExternalLink className="w-4 h-4" /> System Audit Log
              </a>
            </div>
          </div>

          <div className="flex gap-16">
            <div className="text-center md:text-right">
              <div className="text-6xl md:text-7xl font-black italic tracking-tighter text-red-500 leading-none">
                {onChainCount}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest mt-2 font-bold">Verified Logs</div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-6xl md:text-7xl font-black italic tracking-tighter text-white leading-none">
                {totalCount}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest mt-2 font-bold">Total Records</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── NETWORK TELEMETRY (LIVE NODE MONITORS) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Database, label: 'Host Network', value: 'Avalanche C-Chain', dot: 'bg-zinc-800' },
          { icon: Cpu, label: 'Environment', value: 'Fuji Testnet', dot: 'bg-[#00FF00]' },
          { icon: Link2, label: 'Uplink ID', value: '43113', dot: 'bg-red-500' },
        ].map(({ icon: Icon, label, value, dot }) => (
          <div key={label} className="bg-white/[0.01] border border-white/5 border-dashed p-8 relative overflow-hidden flex flex-col items-center text-center">
            <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${dot}`} />
            <Icon className="w-6 h-6 text-zinc-700 mb-4" />
            <div className="text-[11px] text-zinc-400 font-mono uppercase tracking-widest mb-2 font-bold">{label}</div>
            <div className="text-sm font-black text-white uppercase italic tracking-wider">{value}</div>
          </div>
        ))}
      </div>

      {/* ─── ON-CHAIN COMBAT RECORDS (LEDGER FEED) ─── */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Zap className="w-5 h-5 text-red-500" />
          <h2 className="text-xs font-black tracking-[0.4em] uppercase text-white">Verified Combat Log</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            </div>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest italic">Interrogating Node...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {matches.length > 0 ? matches.map((match, i) => {
                const isOnChain = match.tx_hash && match.tx_hash.startsWith('0x') && match.tx_hash.length > 40;
                const winner = match.winner_id === match.player_1_id ? match.player_1 : match.player_2;
                const loser = match.winner_id === match.player_1_id ? match.player_2 : match.player_1;

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all p-6"
                  >
                    {/* Scanning Line Micro-Animation */}
                    <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.02] bg-gradient-to-b from-transparent via-white to-transparent h-2 top-0 group-hover:animate-scan-line" />

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 py-2">

                      {/* Left: Metadata */}
                      <div className="flex items-center gap-8 w-full lg:w-auto">
                        <div className={`shrink-0 font-mono text-xs font-black px-4 py-2 border ${isOnChain
                          ? 'text-[#00FF00] border-[#00FF00]/40 bg-[#00FF00]/5'
                          : 'text-zinc-400 border-white/10'
                          }`}>
                          {isOnChain ? '[ SECURED ]' : '[ PENDING ]'}
                        </div>
                        <div className="font-mono text-sm text-zinc-400 uppercase tracking-widest hidden md:block font-bold">
                          {new Date(match.created_at).toLocaleDateString('en-GB')} {new Date(match.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Middle: Combat Outcome */}
                      <div className="flex items-center gap-6 flex-1 justify-center">
                        <div className="text-right flex-1 flex items-center justify-end gap-3">
                          <div>
                            <span className="block font-black text-white text-xl tracking-tighter uppercase italic">{winner?.name}</span>
                            <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest font-bold">UID: {winner?.wallet_address?.substring(0, 10)}...</span>
                          </div>
                          <img
                            src={winner?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner?.name}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 p-0.5"
                          />
                        </div>

                        <div className="text-zinc-800 font-mono text-sm italic font-black uppercase">def.</div>

                        <div className="text-left flex-1 flex items-center gap-3">
                          <img
                            src={loser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${loser?.name}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 p-0.5 opacity-40"
                          />
                          <div>
                            <span className="block font-black text-zinc-300 text-xl tracking-tighter uppercase italic">{loser?.name}</span>
                            <span className="block font-mono text-xs text-zinc-600 uppercase tracking-widest font-bold">UID: {loser?.wallet_address?.substring(0, 10)}...</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: TX Hash Proof */}
                      <div className="w-full lg:w-48 text-right flex flex-col items-center lg:items-end gap-1">
                        {isOnChain ? (
                          <span
                            className="font-mono text-xs text-zinc-500 transition-colors uppercase tracking-[0.1em]"
                          >
                            Receipt ID: {match.tx_hash!.substring(0, 10)}...{match.tx_hash!.substring(60)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest italic font-bold">Awaiting Validation...</span>
                        )}
                      </div>

                    </div>
                  </motion.div>
                );
              }) : (
                <div className="text-center py-20 border border-dashed border-white/5 bg-white/[0.01]">
                  <p className="font-mono text-[10px] text-zinc-800 uppercase tracking-[0.4em]">No validated proofs indexed on current uplink.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(0); }
          100% { transform: translateY(100px); }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
