import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Eip1193Provider } from 'ethers';
import {
  X, Zap, CreditCard, Wallet, ArrowRight, Check,
  Loader2, Star, Lock, AlertCircle, ChevronRight, Bot, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useChainlinkAvaxPrice } from '../../hooks/useChainlinkAvaxPrice';
import { useUserStore } from '../../lib/user-store';
import { API_URL } from '../../lib/api';

const SPARK_TREASURY_ABI = [
  'function buySparks(uint256 packageId, string calldata userId) external payable',
];
const SPARK_TREASURY_CONTRACT_ADDRESS = '0x15d7F62A8Bf515065c03a40C5e547036b3172CE2';
const FUJI_CHAIN_ID = 43113;
const TX_CONFIRM_TIMEOUT_MS = 45_000;
const BOT_REWARD_PREF_KEY = 'lanista_bot_rewards_enabled';

type PaymentMethodId = 'avax' | 'moonpay' | 'card';

const AVAX_ICON = (
  <svg viewBox="0 0 24 24" fill="#E84142" className="w-5 h-5" aria-hidden="true">
    <polygon points="12,3 22,21 2,21" />
  </svg>
);
const MOONPAY_ICON = (
  <img
    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbx8UcJhmp9gc40I33eD1NvxU2qBYidXZxBQ&s"
    className="w-5 h-5 rounded-full object-cover"
    alt="MoonPay"
  />
);

const PAYMENT_METHODS = [
  {
    id: 'avax' as PaymentMethodId,
    label: 'AVAX Wallet',
    sublabel: 'MetaMask, Core, any EVM wallet',
    icon: AVAX_ICON,
    available: true,
  },
  {
    id: 'moonpay' as PaymentMethodId,
    label: 'MoonPay',
    sublabel: 'Credit / debit card',
    icon: MOONPAY_ICON,
    available: false,
  },
  {
    id: 'card' as PaymentMethodId,
    label: 'Card / Bank',
    sublabel: 'Stripe — direct fiat',
    icon: <CreditCard className="w-4 h-4 text-blue-400" />,
    available: false,
  },
];

interface SparkPackage {
  packageId: number;
  label: string;
  sparkAmount: number;
  priceUsd: number;
  requiredWei: string;
  requiredAvaxFormatted: string;
  badge?: string;
  highlight?: boolean;
  savingsPct?: number;
}

const BASE_USD_PER_1K = 5;
const PKG_META: Record<number, { label: string; badge?: string; highlight?: boolean }> = {
  1: { label: 'Starter' },
  2: { label: 'Challenger', badge: 'Popular' },
  3: { label: 'Commander', badge: '⭐ Best Value', highlight: true },
  4: { label: 'Elite' },
};

interface BuySparkDrawerProps {
  open: boolean;
  onClose: () => void;
  session: { user: { id: string }; access_token: string } | null;
}

export function BuySparkDrawer({ open, onClose, session }: BuySparkDrawerProps) {
  const { priceUsd: avaxUsdPrice } = useChainlinkAvaxPrice(30_000);
  const myAgentId = useUserStore((s) => s.myAgentId);

  const [packages, setPackages] = useState<SparkPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>('avax');
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customSparks, setCustomSparks] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [botRewardEnabled, setBotRewardEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(BOT_REWARD_PREF_KEY) !== 'false'; } catch { return true; }
  });
  const [rewardInfoOpen, setRewardInfoOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_URL}/sparks/packages`)
      .then((r) => r.json())
      .then((data) => {
        const raw = data.packages ?? [];
        const enriched: SparkPackage[] = raw.map((p: any) => {
          const baseUsd = (p.sparkAmount / 1000) * BASE_USD_PER_1K;
          const savingsPct = baseUsd > p.priceUsd
            ? Math.round(((baseUsd - p.priceUsd) / baseUsd) * 100) : 0;
          return { ...p, savingsPct, ...PKG_META[p.packageId] };
        });
        setPackages(enriched);
        const best = enriched.find((p) => p.highlight);
        if (best) setSelectedPkg(best.packageId);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoadingPkgs(false));
  }, [open]);

  const customSparksNum = parseInt(customSparks.replace(/[^0-9]/g, ''), 10) || 0;
  const customAvax = avaxUsdPrice && customSparksNum > 0
    ? (customSparksNum / 1000) * BASE_USD_PER_1K / avaxUsdPrice : null;

  const toggleBotReward = (val: boolean) => {
    setBotRewardEnabled(val);
    try { localStorage.setItem(BOT_REWARD_PREF_KEY, String(val)); } catch (e) { void e; }
  };

  const connectWallet = useCallback(async () => {
    setError(null);
    if (!window.ethereum) { setError('MetaMask or another Web3 wallet is required.'); return; }
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
    } catch (e: any) { setError(e?.message ?? 'Failed to connect wallet'); }
  }, []);

  const handleBuy = async (pkg: SparkPackage) => {
    if (!session?.user?.id || !walletAddress) { setError('Log in and connect your wallet first.'); return; }
    setError(null);
    setBuyingId(pkg.packageId);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SPARK_TREASURY_CONTRACT_ADDRESS, SPARK_TREASURY_ABI, signer);
      const tx = await contract.buySparks(pkg.packageId, session.user.id, { value: pkg.requiredWei });
      try {
        await Promise.race([
          tx.wait(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), TX_CONFIRM_TIMEOUT_MS)),
        ]);
        toast.success(`${pkg.sparkAmount.toLocaleString()} Spark added!`);
      } catch (waitErr: unknown) {
        if (waitErr instanceof Error && waitErr.message === 'TIMEOUT') {
          toast.success('Transaction submitted — balance updates after confirmation.');
        } else { throw waitErr; }
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBuyingId(null);
    }
  };

  const activePkg = packages.find((p) => p.packageId === selectedPkg);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-md bg-[#0a0a0a] border-l border-white/10 flex flex-col overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Spark Store</h2>
                {avaxUsdPrice && (
                  <span className="font-mono text-[10px] text-zinc-500">AVAX ${avaxUsdPrice.toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/buy-sparks"
                  onClick={onClose}
                  className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  Full page <ExternalLink className="w-3 h-3" />
                </Link>
                <button onClick={onClose} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="relative flex-1 overflow-y-auto px-6 pb-6 space-y-5">

              {/* Payment methods */}
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.available}
                    onClick={() => m.available && setSelectedPayment(m.id)}
                    className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all
                      ${m.available
                        ? selectedPayment === m.id
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                        : 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                      }`}
                  >
                    {m.available && selectedPayment === m.id && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2 h-2 text-black" />
                      </span>
                    )}
                    {!m.available && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-zinc-600" />}
                    {m.icon}
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-white text-xs truncate">{m.label}</p>
                      <p className="text-zinc-600 text-[10px] truncate">{m.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Packages */}
              {loadingPkgs ? (
                <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
              ) : selectedPayment === 'avax' ? (
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.packageId}
                      type="button"
                      onClick={() => { setSelectedPkg(pkg.packageId); setUseCustom(false); }}
                      className={`relative w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all
                        ${pkg.highlight
                          ? selectedPkg === pkg.packageId
                            ? 'border-primary bg-primary/15'
                            : 'border-primary/40 bg-primary/5 hover:border-primary/70'
                          : selectedPkg === pkg.packageId
                            ? 'border-white/40 bg-white/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                        }`}
                    >
                      {pkg.badge && (
                        <span className={`absolute -top-2 left-4 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full
                          ${pkg.highlight ? 'bg-primary text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                          {pkg.badge}
                        </span>
                      )}
                      <div>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase">{pkg.label}</p>
                        <p className={`font-black text-lg ${pkg.highlight ? 'text-primary' : 'text-white'}`}>
                          {pkg.sparkAmount.toLocaleString()}<span className="text-xs font-normal text-zinc-400 ml-1">Spark</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-white">${pkg.priceUsd}</p>
                        <p className="font-mono text-[10px] text-zinc-500">~{pkg.requiredAvaxFormatted} AVAX</p>
                        {pkg.savingsPct > 0 && (
                          <p className="font-mono text-[10px] text-emerald-400 font-bold">Save {pkg.savingsPct}%</p>
                        )}
                      </div>
                      {selectedPkg === pkg.packageId && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black" />
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Custom amount */}
                  <button
                    type="button"
                    onClick={() => { setUseCustom(true); setSelectedPkg(null); }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border border-dashed text-left transition-all
                      ${useCustom ? 'border-white/30 bg-white/5' : 'border-white/10 bg-transparent hover:border-white/20'}`}
                  >
                    <div>
                      <p className="font-mono text-[10px] text-zinc-500 uppercase">Custom</p>
                      <p className="text-zinc-400 text-sm font-semibold">Enter any amount</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </button>

                  <AnimatePresence>
                    {useCustom && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={customSparks}
                              onChange={(e) => setCustomSparks(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="e.g. 3500"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-zinc-500">SPARK</span>
                          </div>
                          {customAvax && (
                            <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-right shrink-0">
                              <p className="font-mono font-bold text-white text-sm">{customAvax.toFixed(4)}</p>
                              <p className="font-mono text-[10px] text-zinc-500">AVAX</p>
                            </div>
                          )}
                        </div>
                        {customSparksNum > 0 && customSparksNum < 1000 && (
                          <p className="flex items-center gap-1 text-xs text-amber-500 font-mono mt-1.5">
                            <AlertCircle className="w-3 h-3" /> Min. 1,000 Spark
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Lock className="w-10 h-10 text-zinc-700" />
                  <p className="font-mono font-bold text-white text-sm uppercase tracking-widest">Coming Soon</p>
                  <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
                    {selectedPayment === 'moonpay'
                      ? 'MoonPay lets you buy Spark with a credit or debit card — no crypto wallet needed.'
                      : 'Direct card and bank transfer via Stripe is in development.'}
                  </p>
                  <button onClick={() => setSelectedPayment('avax')}
                    className="flex items-center gap-1 font-mono text-xs text-primary hover:underline mt-1">
                    Use AVAX wallet <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Bot reward toggle */}
              {myAgentId && selectedPayment === 'avax' && (
                <div className={`rounded-xl border transition-colors ${botRewardEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                  <button type="button" onClick={() => setRewardInfoOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className={`w-4 h-4 ${botRewardEnabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span className={`font-mono text-xs font-bold uppercase tracking-widest ${botRewardEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        Bot Rewards
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${botRewardEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-zinc-500'}`}>
                        {botRewardEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    {rewardInfoOpen ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {rewardInfoOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Should the AVAX value of your Spark spending be <span className="text-white font-semibold">distributed equally to all your bots</span>?
                          </p>
                          <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-emerald-400 leading-snug">
                              <span className="font-bold">No extra payment.</span> The reward pool is funded at purchase time by the smart contract.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => toggleBotReward(true)} className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all border ${botRewardEnabled ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-500'}`}>Yes</button>
                            <button onClick={() => toggleBotReward(false)} className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all border ${!botRewardEnabled ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-zinc-500'}`}>No thanks</button>
                          </div>
                          <Link to="/spark" onClick={onClose} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" /> Learn how Spark economy works
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Wallet connect + buy button */}
              {session && selectedPayment === 'avax' && (
                <div className="space-y-3">
                  {!walletAddress ? (
                    <button onClick={connectWallet}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all">
                      <Wallet className="w-4 h-4" /> Connect Wallet
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="font-mono text-xs text-zinc-400">Connected</span>
                        </div>
                        <span className="font-mono text-xs text-zinc-300">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                      </div>
                      <button
                        disabled={(!activePkg && !useCustom) || buyingId !== null || (useCustom && customSparksNum < 1000)}
                        onClick={() => activePkg && handleBuy(activePkg)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {buyingId !== null ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            {activePkg ? `Buy ${activePkg.sparkAmount.toLocaleString()} Spark — $${activePkg.priceUsd}` : 'Select a package'}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </>
                  )}
                  {error && (
                    <p className="flex items-start gap-2 text-xs text-primary font-mono bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{error}
                    </p>
                  )}
                </div>
              )}

              {!session && (
                <p className="flex items-center gap-2 text-sm text-amber-500 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" /> You must be logged in to purchase Spark.
                </p>
              )}

              {/* Footer tags */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
                {[
                  { icon: <Check className="w-3 h-3 text-emerald-400" />, text: 'No hidden fees' },
                  { icon: <Zap className="w-3 h-3 text-primary" />, text: 'Instant balance' },
                  { icon: <Star className="w-3 h-3 text-yellow-400" />, text: '10% rewards bots' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-600">
                    {icon}{text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
