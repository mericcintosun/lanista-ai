import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink, Cpu, Zap, Link2, Database, Copy } from 'lucide-react';
import { API_URL } from '../lib/api';

const ORACLE_CONTRACT = '0xAF470Ae9FE071451E5CC420fb7893326D66c7D12';
const FUJI_EXPLORER = 'https://testnet.snowtrace.io';
const LOOT_CONTRACT = '0x2E078795472996d6FB090A630Dc63f09e3Bda0d1';

interface OnChainMatch {
  id: string;
  tx_hash: string | null;
  created_at: string;
  player_1: { name: string; avatar_url: string; wallet_address?: string };
  player_2: { name: string; avatar_url: string; wallet_address?: string };
  winner_id: string;
  player_1_id: string;
  player_2_id: string;
  winner_loot_item_id?: number | null;
}

interface LootDetails {
  fulfilled: boolean;
  winner: string;
  itemId: number;
  randomness: string;
  timestamp: number;
  requestId: string;
}

export default function Oracle() {
  const [matches, setMatches] = useState<OnChainMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lootDetailsByMatchId, setLootDetailsByMatchId] = useState<Record<string, LootDetails | null>>({});
  const [lootModalMatchId, setLootModalMatchId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/oracle/matches`)
      .then(r => r.json())
      .then(data => {
        if (data.matches) setMatches(data.matches);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openLootModal = (matchId: string) => setLootModalMatchId(matchId);
  const closeLootModal = () => setLootModalMatchId(null);

  const selectedMatch = lootModalMatchId ? matches.find(m => m.id === lootModalMatchId) : null;
  const selectedLootDetails = lootModalMatchId ? lootDetailsByMatchId[lootModalMatchId] : null;

  useEffect(() => {
    if (!lootModalMatchId) return;

    const controller = new AbortController();
    const loadDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/oracle/loot/${lootModalMatchId}`, {
          signal: controller.signal
        });
        const json = await res.json();
        if (json.found && json.loot) {
          const details: LootDetails = {
            fulfilled: Boolean(json.loot.fulfilled),
            winner: String(json.loot.winner),
            itemId: Number(json.loot.itemId),
            randomness: String(json.loot.randomness),
            timestamp: Number(json.loot.timestamp),
            requestId: String(json.loot.requestId)
          };
          setLootDetailsByMatchId(prev => ({ ...prev, [lootModalMatchId]: details }));
          // Eğer loot fulfill olduysa, matches state'ini de güncelle
          if (details.fulfilled) {
            setMatches(prev =>
              prev.map(m =>
                m.id === lootModalMatchId ? { ...m, winner_loot_item_id: details.itemId } : m
              )
            );
          }
        }
      } catch {
        // yut
      }
    };

    if (!lootDetailsByMatchId[lootModalMatchId]) {
      loadDetails();
    }

    return () => controller.abort();
  }, [lootModalMatchId, lootDetailsByMatchId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ORACLE_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onChainCount = matches.filter(m => m.tx_hash && !m.tx_hash.startsWith('{')).length;
  const totalCount = matches.length;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-16 pb-24 px-6 relative">

      {/* ─── HEADER ─── */}
      <section className="text-center space-y-8 pt-12 px-4 flex flex-col items-center justify-center min-h-[30vh]">
        <div className="space-y-4 w-full">
          <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// ARCHIVE PROTOCOL</p>
          <div className="relative inline-block w-full">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.8] break-words px-2">
              THE ORACLE
            </h1>
            {/* Theme Red Shadows (No mix-blend-difference) */}
            <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.8] pointer-events-none">
              THE ORACLE
            </span>
          </div>
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
                  {ORACLE_CONTRACT}
                </p>
                <button
                  onClick={handleCopy}
                  className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 lg:group-hover/addr:opacity-100 transition-all p-2 hover:text-red-500"
                >
                  {copied ? <span className="text-[10px] font-black text-[#00FF00]">COPIED</span> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="pt-4 flex justify-center lg:justify-start">
                <a
                  href={`${FUJI_EXPLORER}/address/${ORACLE_CONTRACT}`}
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

      {/* ─── NETWORK TELEMETRY (LIVE NODE MONITORS) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Database, label: 'Host Network', value: 'Avalanche C-Chain', dot: 'bg-zinc-800' },
          { icon: Cpu, label: 'Environment', value: 'Fuji Testnet', dot: 'bg-[#00FF00]' },
          { icon: Link2, label: 'Uplink ID', value: '43113', dot: 'bg-red-500' },
        ].map(({ icon: Icon, label, value, dot }) => (
          <div key={label} className="glass p-8 relative overflow-hidden flex flex-col items-center text-center rounded-2xl group transition-all duration-300 hover:border-primary/30">
            <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${dot} shadow-[0_0_8px_currentColor]`} />
            <Icon className="w-6 h-6 text-zinc-500 mb-6 group-hover:text-primary transition-colors" />
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em] mb-2 font-bold">{label}</div>
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
                const hasLoot = typeof match.winner_loot_item_id === 'number' && !Number.isNaN(match.winner_loot_item_id as number);

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all p-4 sm:p-5"
                  >
                    {/* Scanning Line Micro-Animation */}
                    <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.02] bg-gradient-to-b from-transparent via-white to-transparent h-2 top-0 group-hover:animate-scan-line" />

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 py-1.5">

                      {/* Left: Metadata */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full lg:w-auto">
                        <div className={`shrink-0 font-mono text-xs font-black px-4 py-2 border ${isOnChain
                          ? 'text-[#00FF00] border-[#00FF00]/40 bg-[#00FF00]/5'
                          : 'text-zinc-400 border-white/10'
                          }`}>
                          {isOnChain ? '[ SECURED ]' : '[ PENDING ]'}
                        </div>
                        <div className="font-mono text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest font-bold">
                          {new Date(match.created_at).toLocaleDateString('en-GB')} {new Date(match.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Middle: Combat Outcome */}
                      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 flex-1 justify-center w-full">
                        <div className="flex items-center justify-end gap-2 sm:gap-3 w-full md:flex-1">
                          <div>
                            <span className="block font-black text-white text-lg sm:text-xl tracking-tighter uppercase italic">{winner?.name}</span>
                            <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest font-bold">UID: {winner?.wallet_address?.substring(0, 10)}...</span>
                            {isOnChain && hasLoot && (
                              <span className="mt-1 inline-flex items-center rounded-full bg-zinc-900/80 border border-zinc-700 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] text-zinc-300">
                                Item #{match.winner_loot_item_id}
                              </span>
                            )}
                            {isOnChain && !hasLoot && (
                              <span className="mt-1 inline-flex items-center rounded-full bg-zinc-900/80 border border-zinc-700 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] text-zinc-400">
                                Loot pending (VRF)
                              </span>
                            )}
                          </div>
                          <img
                            src={winner?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner?.name}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 p-0.5"
                          />
                        </div>

                        <div className="text-zinc-800 font-mono text-xs sm:text-sm italic font-black uppercase">def.</div>

                        <div className="flex items-center gap-2 sm:gap-3 w-full md:flex-1">
                          <img
                            src={loser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${loser?.name}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 p-0.5 opacity-40"
                          />
                          <div>
                            <span className="block font-black text-zinc-300 text-lg sm:text-xl tracking-tighter uppercase italic">{loser?.name}</span>
                            <span className="block font-mono text-xs text-zinc-600 uppercase tracking-widest font-bold">UID: {loser?.wallet_address?.substring(0, 10)}...</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: TX Hash Proof */}
                      <div className="w-full lg:w-48 text-center md:text-right flex flex-col items-center md:items-end gap-1 mt-2 md:mt-0">
                        {isOnChain ? (
                          <button
                            type="button"
                            onClick={() => openLootModal(match.id)}
                            className="font-mono text-[10px] text-zinc-200 bg-zinc-900/70 border border-zinc-600 hover:border-primary/60 hover:text-primary transition-colors uppercase tracking-[0.16em] px-3 py-1.5 rounded-full inline-flex items-center gap-2"
                          >
                            View on-chain proof
                            <ExternalLink className="w-3 h-3" />
                          </button>
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

      <AnimatePresence>
        {lootModalMatchId && selectedMatch && (
          <motion.div
            key="loot-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          >
            <button
              type="button"
              aria-label="Close loot details"
              onClick={closeLootModal}
              className="absolute inset-0 bg-black/70"
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="relative w-full max-w-2xl glass border border-white/10 rounded-3xl p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500 font-bold">
                    Loot proof
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                    Winner Loot
                  </div>
                  <div className="mt-2 text-xs font-mono uppercase tracking-[0.18em] text-zinc-400">
                    Verified via Chainlink VRF
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeLootModal}
                  className="text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
                    Status
                  </div>
                  <div className="mt-2 text-sm font-black uppercase italic tracking-wide text-white">
                    {selectedLootDetails?.fulfilled ? 'Fulfilled' : 'Pending'}
                  </div>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
                    Item
                  </div>
                  <div className="mt-2 text-sm font-black uppercase italic tracking-wide text-white">
                    {selectedLootDetails?.fulfilled
                      ? `Item #${selectedLootDetails.itemId}`
                      : 'Awaiting VRF'}
                  </div>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
                    Winner address
                  </div>
                  <div className="mt-2 text-xs font-mono text-zinc-300 break-all">
                    {selectedLootDetails?.winner && selectedLootDetails.winner !== '0x0000000000000000000000000000000000000000'
                      ? `${selectedLootDetails.winner.substring(0, 10)}...${selectedLootDetails.winner.substring(38)}`
                      : '—'}
                  </div>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
                    VRF request id
                  </div>
                  {selectedLootDetails?.requestId ? (
                    <a
                      href={`${FUJI_EXPLORER}/address/${LOOT_CONTRACT}#events`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-zinc-300 hover:text-primary transition-colors break-all"
                    >
                      {`${selectedLootDetails.requestId.substring(0, 10)}...${selectedLootDetails.requestId.substring(
                        selectedLootDetails.requestId.length - 10
                      )}`}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="mt-2 text-xs font-mono text-zinc-500">—</div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
                  Proof links
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {selectedMatch.tx_hash && (
                    <a
                      href={`${FUJI_EXPLORER}/tx/${selectedMatch.tx_hash}#eventlog`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-zinc-300 hover:text-primary transition-colors"
                    >
                      Match receipt (Avalanche)
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <a
                    href={`${FUJI_EXPLORER}/address/${LOOT_CONTRACT}#events`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-zinc-300 hover:text-primary transition-colors"
                  >
                    Loot events (LootChest)
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
