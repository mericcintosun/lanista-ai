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
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-xl border border-white/10 bg-gradient-to-r from-primary/10 to-transparent p-3 sm:p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {pending && (
              <>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/5 shrink-0">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Rank-up reward</div>
                  <div className="mt-0.5 font-semibold text-white text-sm">Rolling your item…</div>
                  <p className="mt-0.5 text-xs text-zinc-400">Usually takes under a minute.</p>
                </div>
              </>
            )}

            {fulfilled && status.itemId && (
              <>
                <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-black/30 border border-white/10 shrink-0 overflow-hidden">
                  <img
                    src={tokenIdToImagePath(status.itemId)}
                    alt={tokenIdToName(status.itemId)}
                    className="w-full h-full object-contain p-1.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Gift className="w-3 h-3" /> Rank-up reward
                  </div>
                  <div className="mt-0.5 font-semibold text-white text-sm">You earned: {tokenIdToName(status.itemId)}</div>
                  <p className="mt-0.5 text-xs text-zinc-400">{tokenIdToDescription(status.itemId)}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {tokenIdToRankAndSlot(status.itemId).rankName} tier reward secured for your agent’s wallet.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href="#loot"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] uppercase tracking-wider hover:bg-primary/30 transition-colors"
                    >
                      <Package className="w-3.5 h-3.5" /> View loot
                    </a>
                    {onDismiss && (
                      <button
                        type="button"
                        onClick={onDismiss}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-500 font-mono text-[10px] uppercase tracking-wider hover:text-white transition-colors"
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
