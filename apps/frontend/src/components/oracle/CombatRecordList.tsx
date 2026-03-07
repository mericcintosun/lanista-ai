import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, ExternalLink, Link2 } from 'lucide-react';
import type { OnChainMatch } from '../../hooks/useOracleData';

const FUJI_EXPLORER = 'https://testnet.snowtrace.io';

interface CombatRecordListProps {
  matches: OnChainMatch[];
  loading: boolean;
  onOpenLootModal: (matchId: string) => void;
}

export function CombatRecordList({ 
  matches, 
  loading, 
  onOpenLootModal 
}: CombatRecordListProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="text-xs font-black tracking-[0.4em] uppercase text-white">Verified Battle Log</h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest italic">Checking Oracle…</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {matches.length > 0 ? matches.map((match, i) => {
              const isOnChain = match.tx_hash && match.tx_hash.startsWith('0x') && match.tx_hash.length > 40;
              const isPendingProof = match.tx_hash && match.tx_hash.startsWith('{');
              const winner = match.winner_id === match.player_1_id ? match.player_1 : match.player_2;
              const loser = match.winner_id === match.player_1_id ? match.player_2 : match.player_1;
              const hasRankUpRequest = !!match.rank_up_loot_request;
              const itemId = match.winner_loot_item_id ?? match.rank_up_loot_request?.item_id ?? null;
              const hasLoot = typeof itemId === 'number' && !Number.isNaN(itemId) && itemId > 0;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all p-4 sm:p-5"
                >
                  <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.02] bg-gradient-to-b from-transparent via-white to-transparent h-2 top-0 group-hover:animate-scan-line" />

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 py-1.5">
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

                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 flex-1 justify-center w-full">
                      <div className="flex items-center justify-end gap-2 sm:gap-3 w-full md:flex-1">
                        <div>
                          <Link
                            to={`/agent/${match.winner_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block font-black text-white text-lg sm:text-xl tracking-tighter uppercase italic hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-[220px]"
                          >
                            {winner?.name}
                          </Link>
                          <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest font-bold">UID: {winner?.wallet_address?.substring(0, 10)}...</span>
                          {isOnChain && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-zinc-900/80 border border-zinc-700 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] text-zinc-300">
                              {hasRankUpRequest && hasLoot ? `Item #${itemId}` : hasRankUpRequest ? 'Reward pending' : '—'}
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
                          <Link
                            to={`/agent/${match.winner_id === match.player_1_id ? match.player_2_id : match.player_1_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block font-black text-zinc-300 text-lg sm:text-xl tracking-tighter uppercase italic hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-[220px]"
                          >
                            {loser?.name}
                          </Link>
                          <span className="block font-mono text-xs text-zinc-600 uppercase tracking-widest font-bold">UID: {loser?.wallet_address?.substring(0, 10)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-48 text-center md:text-right flex flex-col items-center md:items-end gap-1 mt-2 md:mt-0">
                      {isOnChain ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenLootModal(match.id)}
                            className="font-mono text-[10px] text-zinc-200 bg-zinc-900/70 border border-zinc-600 hover:border-primary/60 hover:text-primary transition-colors uppercase tracking-[0.16em] px-3 py-1.5 rounded-full inline-flex items-center gap-2"
                          >
                            Battle log
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          {match.tx_hash && match.tx_hash.startsWith('0x') && (
                            <a
                              href={`${FUJI_EXPLORER}/tx/${match.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-zinc-500 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/40 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors"
                              title="View on Avalanche Explorer"
                            >
                              <Link2 className="w-3 h-3" />
                              Explorer
                            </a>
                          )}
                        </div>
                      ) : isPendingProof ? (
                        <span className="font-mono text-xs text-amber-500/90 uppercase tracking-widest italic font-bold">Sealing…</span>
                      ) : (
                        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest italic font-bold">Awaiting verification…</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="text-center py-20 border border-dashed border-white/5 bg-white/[0.01]">
                <p className="font-mono text-[10px] text-zinc-800 uppercase tracking-[0.4em]">No verified battles yet.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
