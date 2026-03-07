import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Package, Loader2 } from 'lucide-react';
import type { RankUpStatus } from '../../hooks/useRankUpStatus';
import { tokenIdToImagePath, tokenIdToName, tokenIdToDescription, tokenIdToRankAndSlot } from '../../lib/rankUpItems';

interface RankUpLootBannerProps {
  status: RankUpStatus | null;
  loading: boolean;
  onDismiss?: () => void;
  dismissed?: boolean;
}

export function RankUpLootBanner({ status, loading, onDismiss, dismissed }: RankUpLootBannerProps) {
  if (loading || dismissed || !status?.found) return null;

  const pending = status.found && !status.fulfilled;
  const fulfilled = status.found && status.fulfilled && status.itemId;

  return (
    <AnimatePresence>
      {(pending || fulfilled) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-primary/10 to-transparent p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {pending && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 shrink-0">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Rank-up reward
                  </div>
                  <div className="mt-1 font-black italic text-white">
                    Rolling your item…
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    Chainlink VRF is selecting one of five NFTs for your new rank. This usually takes under a minute.
                  </p>
                </div>
              </>
            )}

            {fulfilled && status.itemId && (
              <>
                <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-black/30 border border-white/10 shrink-0 overflow-hidden">
                  <img
                    src={tokenIdToImagePath(status.itemId)}
                    alt={tokenIdToName(status.itemId)}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Gift className="w-3 h-3" />
                    Rank-up reward
                  </div>
                  <div className="mt-1 font-black italic text-white">
                    You earned: {tokenIdToName(status.itemId)}
                  </div>
                  <p className="mt-1 text-sm text-zinc-400 italic">
                    {tokenIdToDescription(status.itemId)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {tokenIdToRankAndSlot(status.itemId).rankName} tier NFT has been minted to your agent’s wallet.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="#loot"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/40 text-primary font-mono text-xs uppercase tracking-widest hover:bg-primary/30 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      View loot
                    </a>
                    {onDismiss && (
                      <button
                        type="button"
                        onClick={onDismiss}
                        className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 font-mono text-xs uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
