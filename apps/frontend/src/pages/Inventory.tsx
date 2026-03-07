import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ExternalLink, X } from 'lucide-react';
import { API_URL } from '../lib/api';
import { tokenIdToImagePath, tokenIdToName, tokenIdToDescription, tokenIdToRankAndSlot } from '../lib/rankUpItems';

interface InventoryItem {
  tokenId: number;
  balance: number;
}

const FUJI_EXPLORER = 'https://testnet.snowtrace.io';
const RANK_UP_LOOT_NFT_ADDRESS = '0xde15a54ef5f3d993352532faca843889ec2072b2';

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const walletFromUrl = searchParams.get('wallet') ?? '';
  const [wallet, setWallet] = useState(walletFromUrl);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (!walletFromUrl) return;
    queueMicrotask(() => setWallet(walletFromUrl));
  }, [walletFromUrl]);

  const hasValidWallet = Boolean(wallet && wallet.length >= 40);
  const effectiveItems = hasValidWallet ? items : [];
  const effectiveError = hasValidWallet ? error : null;

  useEffect(() => {
    if (!hasValidWallet) return;
    const ac = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetch(`${API_URL}/oracle/inventory/${encodeURIComponent(wallet!)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
        else setItems([]);
      })
      .catch((e) => {
        setError(e?.message ?? 'Failed to load inventory');
        setItems([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [wallet, hasValidWallet]);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500 font-bold flex items-center gap-2">
          <Package className="w-4 h-4" />
          Rank-up loot
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
          Inventory
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-xl">
          Loot earned when your Lany ranks up. Oracle-verified.
        </p>
      </motion.div>

      <div className="mb-8">
        <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Wallet address
        </label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x..."
          className="w-full max-w-xl px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none"
        />
      </div>

      {effectiveError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {effectiveError}
        </div>
      )}

      {loading && (
        <div className="text-zinc-500 font-mono text-sm">Loading…</div>
      )}

      {!loading && wallet && effectiveItems.length === 0 && !effectiveError && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-zinc-400">
          No rank-up loot in this wallet.
        </div>
      )}

      {!loading && effectiveItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {effectiveItems.map(({ tokenId, balance }) => {
            const { rankName } = tokenIdToRankAndSlot(tokenId);
            const description = tokenIdToDescription(tokenId);
            return (
              <motion.div
                key={tokenId}
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden cursor-pointer"
                onClick={() => setSelectedItem({ tokenId, balance })}
                title={description}
              >
                <div className="aspect-square bg-white/5 relative">
                  <img
                    src={tokenIdToImagePath(tokenId)}
                    alt={tokenIdToName(tokenId)}
                    className="w-full h-full object-contain p-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const placeholder = (e.target as HTMLImageElement).nextElementSibling;
                      if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                    }}
                  />
                  <div
                    className="absolute inset-0 hidden items-center justify-center bg-zinc-800/80 text-zinc-500 font-mono text-xs"
                    style={{ display: 'none' }}
                  >
                    #{tokenId}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider">
                    {rankName}
                  </div>
                  <div className="font-black italic text-white truncate">
                    {tokenIdToName(tokenId)}
                  </div>
                  {balance > 1 && (
                    <div className="text-[10px] text-zinc-400 mt-0.5">× {balance}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {RANK_UP_LOOT_NFT_ADDRESS && wallet && (
        <div className="mt-8">
          <a
            href={`${FUJI_EXPLORER}/address/${RANK_UP_LOOT_NFT_ADDRESS}?a=${wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors"
          >
            View on Snowtrace
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-square rounded-xl bg-black/40 border border-white/10 overflow-hidden mb-4">
                <img
                  src={tokenIdToImagePath(selectedItem.tokenId)}
                  alt={tokenIdToName(selectedItem.tokenId)}
                  className="w-full h-full object-contain p-6"
                />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                {tokenIdToRankAndSlot(selectedItem.tokenId).rankName}
              </div>
              <h3 className="font-black italic text-xl text-white mb-3">
                {tokenIdToName(selectedItem.tokenId)}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {tokenIdToDescription(selectedItem.tokenId)}
              </p>
              {selectedItem.balance > 1 && (
                <div className="mt-3 text-xs text-zinc-500 font-mono">
                  Balance: × {selectedItem.balance}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
