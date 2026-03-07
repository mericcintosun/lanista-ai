import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ExternalLink, X, Sparkles, RefreshCw } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';
import { API_URL } from '../../lib/api';
import { tokenIdToImagePath, tokenIdToName, tokenIdToDescription, tokenIdToRankAndSlot } from '../../lib/rankUpItems';

const FUJI_EXPLORER = 'https://testnet.snowtrace.io';
const RANK_UP_LOOT_NFT_ADDRESS =
  import.meta.env.VITE_RANK_UP_LOOT_NFT_ADDRESS || '0xaE1Aa40228A5eeD0e0D0218f6402C4911b97efd8';

interface InventoryItem {
  tokenId: number;
  balance: number;
}

interface AgentLootSectionProps {
  walletAddress: string | null | undefined;
  agentName?: string;
  /** Pre-fetched inventory from agent API; avoids separate fetch and loading state */
  initialInventory?: { tokenId: number; balance: number }[];
}

function LootCard({
  tokenId,
  balance,
  idx,
  onSelect,
}: {
  tokenId: number;
  balance: number;
  idx: number;
  onSelect: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { rankName } = tokenIdToRankAndSlot(tokenId);
  const name = tokenIdToName(tokenId);
  const src = tokenIdToImagePath(tokenId);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="group relative rounded-xl border border-red-900/30 bg-transparent overflow-hidden text-left transition-all hover:border-red-700/50 hover:shadow-[0_0_30px_rgba(127,29,29,0.15)]"
    >
      <div className="aspect-square bg-gradient-to-b from-white/5 to-transparent relative flex items-center justify-center p-4">
        {!imgLoaded && (
          <div className="absolute inset-0">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        )}
        <img
          src={src}
          alt={name}
          loading="eager"
          fetchPriority={idx < 4 ? 'high' : undefined}
          className={`w-full h-full object-contain transition-opacity duration-200 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            setImgLoaded(true);
          }}
        />
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-red-900/40 border border-red-900/30 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          {rankName}
        </div>
      </div>
      <div className="p-3 border-t border-red-900/30">
        <p className="font-black text-white text-sm italic uppercase tracking-tight truncate">{name}</p>
        {balance > 1 && (
          <p className="text-xs text-zinc-500 font-mono mt-0.5">× {balance}</p>
        )}
      </div>
    </motion.button>
  );
}

export function AgentLootSection({ walletAddress, agentName, initialInventory }: AgentLootSectionProps) {
  const hasValidWallet = Boolean(walletAddress && walletAddress.length >= 40);
  const [items, setItems] = useState<InventoryItem[]>(() =>
    Array.isArray(initialInventory) ? initialInventory : []
  );
  const [loading, setLoading] = useState(hasValidWallet && !initialInventory);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const effectiveItems = hasValidWallet ? items : [];

  const fetchInventory = useCallback(() => {
    if (!hasValidWallet || !walletAddress) return;
    setLoading(true);
    fetch(`${API_URL}/oracle/inventory/${encodeURIComponent(walletAddress)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [walletAddress, hasValidWallet]);

  useEffect(() => {
    if (Array.isArray(initialInventory)) {
      setItems(initialInventory);
      setLoading(false);
      return;
    }
    if (!hasValidWallet) return;
    fetchInventory();
  }, [walletAddress, hasValidWallet, initialInventory, fetchInventory]);

  if (!walletAddress) return null;

  return (
    <section id="loot" className="scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-red-900/30 bg-transparent overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(127,29,29,0.06),transparent)] pointer-events-none" />
        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-900/20 border border-red-900/30 flex items-center justify-center">
                <Package className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  Rank-up Loot
                  <span className="text-[10px] font-mono font-normal normal-case text-zinc-500 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> VRF
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
                  Loot earned when {agentName ?? 'this Lany'} ranks up
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchInventory}
                disabled={loading}
                className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors border border-red-900/30 hover:border-red-700/50 px-3 py-2 rounded-lg disabled:opacity-50"
                title="Refresh inventory"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {RANK_UP_LOOT_NFT_ADDRESS && (
                <a
                  href={`${FUJI_EXPLORER}/address/${RANK_UP_LOOT_NFT_ADDRESS}?a=${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors border border-red-900/30 hover:border-red-700/50 px-3 py-2 rounded-lg"
                >
                  View on Snowtrace <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-4 h-4 rounded-full border-2 border-primary/50 border-t-primary animate-spin" />
                <span className="font-mono text-xs uppercase tracking-widest">Loading loot…</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-red-900/30 bg-transparent overflow-hidden">
                    <Skeleton className="aspect-square" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && effectiveItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-red-900/30 bg-transparent py-16 px-6 text-center">
              <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">No rank-up loot yet</p>
              <p className="text-xs text-zinc-600 mt-2 max-w-xs mx-auto">Win matches and rank up to earn Oracle-verified loot.</p>
            </div>
          )}

          {!loading && effectiveItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {effectiveItems.map(({ tokenId, balance }, idx) => (
                <LootCard
                  key={tokenId}
                  tokenId={tokenId}
                  balance={balance}
                  idx={idx}
                  onSelect={() => setSelectedItem({ tokenId, balance })}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-square rounded-xl bg-black/50 border border-white/10 overflow-hidden mb-5 flex items-center justify-center p-8">
                <img
                  src={tokenIdToImagePath(selectedItem.tokenId)}
                  alt={tokenIdToName(selectedItem.tokenId)}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">
                {tokenIdToRankAndSlot(selectedItem.tokenId).rankName} tier
              </div>
              <h3 className="font-black italic text-2xl text-white mb-3">
                {tokenIdToName(selectedItem.tokenId)}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {tokenIdToDescription(selectedItem.tokenId)}
              </p>
              {selectedItem.balance > 1 && (
                <div className="mt-4 text-xs text-zinc-500 font-mono">
                  Balance: × {selectedItem.balance}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
