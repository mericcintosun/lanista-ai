import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { OnChainMatch, LootDetails } from '../../hooks/useOracleData';

interface LootProofModalProps {
  lootModalMatchId: string | null;
  selectedMatch: OnChainMatch | null;
  selectedLootDetails: LootDetails | null;
  onClose: () => void;
  fujiExplorer: string;
  lootContractAddress: string;
}

export function LootProofModal({
  lootModalMatchId,
  selectedMatch,
  selectedLootDetails,
  onClose,
  fujiExplorer,
  lootContractAddress
}: LootProofModalProps) {
  return (
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
            onClick={onClose}
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
                  Verified on-chain
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
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
                    href={`${fujiExplorer}/address/${lootContractAddress}#events`}
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
                    href={`${fujiExplorer}/tx/${selectedMatch.tx_hash}#eventlog`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-zinc-300 hover:text-primary transition-colors"
                  >
                    Match receipt (Avalanche)
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <a
                  href={`${fujiExplorer}/address/${lootContractAddress}#events`}
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
  );
}
