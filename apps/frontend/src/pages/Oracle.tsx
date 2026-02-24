import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink, Trophy, Cpu, Zap, Link2, CheckCircle2, Clock, Database } from 'lucide-react';

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

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/oracle/matches')
      .then(r => r.json())
      .then(data => {
        if (data.matches) setMatches(data.matches);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const onChainCount = matches.filter(m => m.tx_hash && !m.tx_hash.startsWith('{')).length;
  const totalCount = matches.length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12">

      {/* Header */}
      <section className="text-center space-y-6 mt-8">
        <h1
          className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 glitch-effect select-none"
          data-text="THE ORACLE"
        >
          THE ORACLE
        </h1>
        <p className="text-neutral-400 font-mono text-sm max-w-xl mx-auto leading-relaxed">
          Every battle result is cryptographically sealed on Avalanche C-Chain (Fuji). Immutable. Trustless. Forever.
        </p>
      </section>

      {/* Contract Info Banner */}
      <div className="bg-gradient-to-r from-neutral-900/80 via-red-950/20 to-neutral-900/80 border border-primary/30 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">ArenaOracle Smart Contract</p>
              <p className="font-mono text-xs text-neutral-300 break-all">{ORACLE_CONTRACT}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-primary">{onChainCount}</div>
              <div className="text-xs font-mono text-neutral-500 uppercase">On-Chain</div>
            </div>
            <div className="w-px h-10 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">{totalCount}</div>
              <div className="text-xs font-mono text-neutral-500 uppercase">Total</div>
            </div>
            <a
              href={`${FUJI_EXPLORER}/address/${ORACLE_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-xl text-primary text-xs font-bold font-mono transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Snowtrace
            </a>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Database, label: 'Protocol', value: 'Avalanche C-Chain' },
          { icon: Cpu, label: 'Network', value: 'Fuji Testnet' },
          { icon: Link2, label: 'Chain ID', value: '43113' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-5 backdrop-blur-md text-center">
            <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-1">{label}</div>
            <div className="text-sm font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Match List */}
      <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-800/50">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">On-Chain Combat Records</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-t-2 border-primary rounded-full animate-spin" />
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`rounded-xl border p-5 relative overflow-hidden ${
                      isOnChain
                        ? 'bg-black/50 border-primary/30'
                        : 'bg-black/30 border-neutral-800'
                    }`}
                  >
                    {/* Subtle glow for on-chain */}
                    {isOnChain && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                    )}

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* Match Info */}
                      <div className="flex items-center gap-6">
                        {/* Status Badge */}
                        <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                          isOnChain
                            ? 'text-green-400 border-green-500/30 bg-green-500/10'
                            : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                        }`}>
                          {isOnChain
                            ? <><CheckCircle2 className="w-3 h-3" /> ON-CHAIN</>
                            : <><Clock className="w-3 h-3" /> PENDING</>
                          }
                        </div>

                        {/* Fighters */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Trophy className="w-3.5 h-3.5 text-primary" />
                              <span className="text-sm font-bold text-white">{winner?.name}</span>
                            </div>
                            {winner?.wallet_address && (
                              <p className="text-xs text-neutral-500 font-mono">
                                {winner.wallet_address.substring(0, 8)}...
                              </p>
                            )}
                          </div>
                          <img
                            src={winner?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner?.name}`}
                            alt=""
                            className="w-10 h-10 rounded-full bg-neutral-900 ring-2 ring-primary/50"
                          />
                          <span className="text-neutral-600 font-mono font-bold text-xs">def.</span>
                          <img
                            src={loser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${loser?.name}`}
                            alt=""
                            className="w-10 h-10 rounded-full bg-neutral-900 ring-2 ring-neutral-800 opacity-60"
                          />
                          <div>
                            <div className="text-sm font-bold text-neutral-500">{loser?.name}</div>
                            {loser?.wallet_address && (
                              <p className="text-xs text-neutral-600 font-mono">
                                {loser.wallet_address.substring(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TX Hash + Link */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-neutral-600 font-mono">
                          {new Date(match.created_at).toLocaleString()}
                        </span>
                        {isOnChain ? (
                          <a
                            href={`${FUJI_EXPLORER}/tx/${match.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary font-mono hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {match.tx_hash!.substring(0, 12)}...{match.tx_hash!.substring(60)}
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-600 font-mono">Awaiting confirmation...</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="text-center py-16 text-neutral-600 font-mono text-sm border border-dashed border-neutral-800 rounded-xl">
                  No combat records yet. Spawn agents to begin.
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
