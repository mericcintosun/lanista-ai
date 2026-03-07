import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Eip1193Provider } from 'ethers';
import { X, Zap, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { API_URL } from '../../lib/api';
import { useChainlinkAvaxPrice } from '../../hooks/useChainlinkAvaxPrice';

const TX_CONFIRM_TIMEOUT_MS = 45_000;
const SPARK_TREASURY_ABI = [
  'function buySparks(uint256 packageId, string calldata userId) external payable',
];

const FUJI_CHAIN_ID = 43113;
const SPARK_TREASURY_CONTRACT_ADDRESS = '0x79545A9F603Bc813CCd8429B9ad74fBb7c02a5cf';

interface SparkPackage {
  packageId: number;
  sparkAmount: number;
  priceUsd: number;
  requiredWei: string;
  requiredAvaxFormatted: string;
}

interface SparkStoreModalProps {
  onClose: () => void;
  session: { user: { id: string } } | null;
  onPurchased?: () => void;
}

export function SparkStoreModal({ onClose, session, onPurchased }: SparkStoreModalProps) {
  const [packages, setPackages] = useState<SparkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { priceUsd: avaxUsdPrice } = useChainlinkAvaxPrice(30_000);

  useEffect(() => {
    fetch(`${API_URL}/sparks/packages`)
      .then((res) => res.json())
      .then((data) => {
        setPackages(data.packages ?? []);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const connectWallet = async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask or another Web3 wallet is required.');
      return;
    }
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== FUJI_CHAIN_ID) {
        try {
          await (window.ethereum as Eip1193Provider).request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${FUJI_CHAIN_ID.toString(16)}` }],
          });
        } catch {
          setError('Please switch to Avalanche Fuji testnet in your wallet.');
          return;
        }
      }
      setWalletAddress(accounts[0]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to connect wallet');
    }
  };

  const handleBuy = async (pkg: SparkPackage) => {
    if (!session?.user?.id || !walletAddress) {
      setError('Please log in and connect your wallet.');
      return;
    }
    setError(null);
    setBuyingId(pkg.packageId);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SPARK_TREASURY_CONTRACT_ADDRESS, SPARK_TREASURY_ABI, signer);
      // Send exactly requiredWei (from API/Chainlink). Contract does not refund excess.
      const tx = await contract.buySparks(pkg.packageId, session.user.id, {
        value: pkg.requiredWei,
      });
      try {
        await Promise.race([
          tx.wait(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('CONFIRM_TIMEOUT')), TX_CONFIRM_TIMEOUT_MS)
          ),
        ]);
      } catch (waitErr: unknown) {
        const msg = waitErr instanceof Error ? waitErr.message : '';
        if (msg === 'CONFIRM_TIMEOUT') {
          toast.success('Transaction submitted. Your balance will update once the network confirms it.');
        } else {
          throw waitErr;
        }
      }
      onPurchased?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      setError(msg);
    } finally {
      setBuyingId(null);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          layout
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Auth modal–style background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

          <div className="relative flex justify-between items-center px-8 pt-8 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Spark Store
              </h2>
            </div>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all outline-none"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="relative text-zinc-500 text-sm font-mono px-8 -mt-2 mb-2">
            Buy Sparks with AVAX on Fuji testnet.
            {avaxUsdPrice != null && (
              <span className="ml-1 text-zinc-400">· AVAX/USD: ${avaxUsdPrice.toFixed(2)}</span>
            )}
          </p>

          <div className="relative px-8 pb-8 pt-2 space-y-4">
            {!session && (
              <p className="text-sm text-amber-500 font-mono">
                Log in to purchase Sparks. Your user ID will be linked to the purchase.
              </p>
            )}
            {!walletAddress && session && (
              <Button onClick={connectWallet} variant="primary" className="w-full">
                Connect Wallet (Fuji)
              </Button>
            )}
            {walletAddress && (
              <p className="text-xs text-zinc-500 font-mono truncate">
                Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            )}

            {error && (
              <p className="text-sm text-primary font-mono bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-zinc-500 font-mono text-sm text-center py-6">
                No packages available. Contract may not be deployed.
              </p>
            ) : (
              <ul className="space-y-3">
                {packages.map((pkg) => (
                  <li
                    key={pkg.packageId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div>
                      <p className="font-mono font-bold text-white">
                        {pkg.sparkAmount.toLocaleString()} Spark
                      </p>
                      <p className="text-xs text-zinc-500">
                        ${pkg.priceUsd.toFixed(2)} USD · ~{pkg.requiredAvaxFormatted} AVAX
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!session || !walletAddress || buyingId !== null}
                      isLoading={buyingId === pkg.packageId}
                      onClick={() => handleBuy(pkg)}
                    >
                      Buy
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

declare global {
  interface Window {
    ethereum?: unknown;
  }
}
