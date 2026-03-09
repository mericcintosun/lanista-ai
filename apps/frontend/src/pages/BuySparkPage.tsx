import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Eip1193Provider } from 'ethers';
import {
  Zap, CreditCard, Wallet, ArrowRight, Check, Loader2,
  Star, ChevronRight, AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../lib/auth-store';
import { useChainlinkAvaxPrice } from '../hooks/useChainlinkAvaxPrice';
import { API_URL } from '../lib/api';
import { Reveal } from '../components/common/Reveal';

const SPARK_TREASURY_ABI = [
  'function buySparks(uint256 packageId, string calldata userId) external payable',
];
const SPARK_TREASURY_CONTRACT_ADDRESS =
  import.meta.env.VITE_SPARK_TREASURY_CONTRACT_ADDRESS || '0x59aa405bD1c7f64748E36A71cC0828878D287ADE';
const FUJI_CHAIN_ID = 43113;
const TX_CONFIRM_TIMEOUT_MS = 45_000;

// ─── Payment Methods ─────────────────────────────────────────────────────────

type PaymentMethodId = 'avax' | 'moonpay' | 'card';

interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  available: boolean;
  badge?: string;
}

const AVAX_ICON = (
  <svg viewBox="0 0 24 24" fill="#E84142" className="w-6 h-6" aria-hidden="true">
    <polygon points="12,3 22,21 2,21" />
  </svg>
);
const MOONPAY_ICON = (
  <img
    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbx8UcJhmp9gc40I33eD1NvxU2qBYidXZxBQ&s"
    className="w-6 h-6 rounded-full object-cover"
    alt="MoonPay"
  />
);

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'avax',
    label: 'AVAX Wallet',
    sublabel: 'MetaMask, Core, any EVM wallet',
    icon: AVAX_ICON,
    available: true,
  },
  {
    id: 'moonpay',
    label: 'MoonPay',
    sublabel: 'Buy with credit or debit card',
    icon: MOONPAY_ICON,
    available: false,
    badge: 'Coming Soon',
  },
  {
    id: 'card',
    label: 'Card / Bank',
    sublabel: 'Stripe — direct fiat purchase',
    icon: <CreditCard className="w-5 h-5 text-blue-400" />,
    available: false,
    badge: 'Coming Soon',
  },
];

// ─── Spark Packages ──────────────────────────────────────────────────────────

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

const BASE_USD_PER_1K = 5; // $5 / 1000 Sparks

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BuySparkPage() {
  const session = useAuthStore((s) => s.session);
  const navigate = useNavigate();
  const { priceUsd: avaxUsdPrice } = useChainlinkAvaxPrice(30_000);

  const [packages, setPackages] = useState<SparkPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>('avax');
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customSparks, setCustomSparks] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Fetch packages from backend
  useEffect(() => {
    fetch(`${API_URL}/sparks/packages`)
      .then((r) => r.json())
      .then((data) => {
        const raw: Array<{ packageId: number; sparkAmount: number; priceUsd: number; requiredWei: string; requiredAvaxFormatted: string }> = data.packages ?? [];
        const BADGES: Record<number, { badge?: string; highlight?: boolean }> = {
          1: {},
          2: { badge: 'Popular' },
          3: { badge: '⭐ Best Value', highlight: true },
          4: {},
        };
        const LABELS: Record<number, string> = {
          1: 'Starter',
          2: 'Challenger',
          3: 'Commander',
          4: 'Elite',
        };
        const enriched = raw.map((p) => {
          const baseUsd = (p.sparkAmount / 1000) * BASE_USD_PER_1K;
          const savingsPct = baseUsd > p.priceUsd
            ? Math.round(((baseUsd - p.priceUsd) / baseUsd) * 100)
            : 0;
          return {
            ...p,
            label: LABELS[p.packageId] ?? `Package ${p.packageId}`,
            savingsPct,
            ...BADGES[p.packageId],
          };
        });
        setPackages(enriched);
        const bestPkg = enriched.find((p) => p.highlight);
        if (bestPkg) setSelectedPkg(bestPkg.packageId);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoadingPkgs(false));
  }, []);

  // Custom amount AVAX calculation
  const customSparksNum = parseInt(customSparks.replace(/[^0-9]/g, ''), 10) || 0;
  const customAvax = avaxUsdPrice && customSparksNum > 0
    ? (customSparksNum / 1000) * BASE_USD_PER_1K / avaxUsdPrice
    : null;
  const customUsd = customSparksNum > 0 ? (customSparksNum / 1000) * BASE_USD_PER_1K : null;

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
    } catch (e: any) {
      setError(e?.message ?? 'Failed to connect wallet');
    }
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
        toast.success(`${pkg.sparkAmount.toLocaleString()} Spark added to your account!`);
      } catch (waitErr: unknown) {
        if (waitErr instanceof Error && waitErr.message === 'TIMEOUT') {
          toast.success('Transaction submitted — balance updates after confirmation.');
        } else { throw waitErr; }
      }
      navigate('/hub');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBuyingId(null);
    }
  };

  const activePkg = packages.find((p) => p.packageId === selectedPkg);

  return (
    <div className="min-h-screen pb-24 px-4">
      <Reveal>
        <div className="max-w-4xl mx-auto pt-8 md:pt-10 space-y-6 md:space-y-8">

          {/* Header */}
          <div className="text-center space-y-2 md:space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 font-mono text-xs text-primary uppercase tracking-widest">
              <Zap className="w-3 h-3" />
              Buy Spark
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white leading-tight">
              Power up your arena presence.
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Spark fuels every interaction — from tomato throws to megaphone broadcasts.
            </p>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 md:space-y-3">
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Payment method</p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  disabled={!method.available}
                  onClick={() => method.available && setSelectedPayment(method.id)}
                  className={`relative flex flex-col gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all
                    ${method.available
                      ? selectedPayment === method.id
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5'
                      : 'border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed'
                    }`}
                >
                  {method.badge && (
                    <span className="absolute top-1.5 right-1.5 font-mono text-[8px] uppercase tracking-widest px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 hidden sm:block">
                      {method.badge}
                    </span>
                  )}
                  {selectedPayment === method.id && method.available && (
                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2 h-2 text-black" />
                    </span>
                  )}
                  <div>{method.icon}</div>
                  <div>
                    <p className="font-mono font-bold text-white text-[11px] md:text-xs">{method.label}</p>
                    <p className="text-zinc-500 text-[9px] md:text-[10px] leading-snug mt-0.5 hidden sm:block">{method.sublabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Packages */}
          <div className="space-y-3">
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Choose a package</p>
            {loadingPkgs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Best Value (Commander) — full-width featured card */}
                {packages.filter(p => p.highlight).map((pkg) => (
                  <button
                    key={pkg.packageId}
                    type="button"
                    onClick={() => { setSelectedPkg(pkg.packageId); setUseCustom(false); }}
                    className={`relative w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border text-left transition-all
                      ${selectedPkg === pkg.packageId
                        ? 'border-primary bg-primary/15 shadow-[0_0_32px_rgba(var(--primary-rgb),0.25)]'
                        : 'border-primary/50 bg-primary/8 hover:border-primary hover:bg-primary/12'
                      }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full bg-primary text-black flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-black" /> {pkg.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-4 min-w-0">
                      <div>
                        <p className="font-mono text-[10px] text-primary/70 uppercase tracking-widest">{pkg.label}</p>
                        <p className="text-3xl font-black text-white leading-tight mt-0.5">
                          {pkg.sparkAmount.toLocaleString()}
                          <span className="text-sm font-normal text-zinc-400 ml-1.5">Spark</span>
                        </p>
                      </div>
                      {pkg.savingsPct > 0 && (
                        <span className="shrink-0 font-mono text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                          Save {pkg.savingsPct}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-mono font-black text-white text-xl">${pkg.priceUsd}</p>
                        {avaxUsdPrice && (
                          <p className="font-mono text-[10px] text-zinc-500 mt-0.5">~{pkg.requiredAvaxFormatted} AVAX</p>
                        )}
                      </div>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all
                        ${selectedPkg === pkg.packageId ? 'bg-primary' : 'bg-white/10'}`}>
                        <Check className={`w-3 h-3 ${selectedPkg === pkg.packageId ? 'text-black' : 'text-zinc-600'}`} />
                      </span>
                    </div>
                  </button>
                ))}

                {/* Other packages — 2-column compact grid */}
                <div className="grid grid-cols-2 gap-2">
                  {packages.filter(p => !p.highlight).map((pkg) => (
                    <button
                      key={pkg.packageId}
                      type="button"
                      onClick={() => { setSelectedPkg(pkg.packageId); setUseCustom(false); }}
                      className={`relative flex flex-col p-3.5 rounded-xl border text-left transition-all
                        ${pkg.badge
                          ? selectedPkg === pkg.packageId
                            ? 'border-zinc-500 bg-zinc-700/50'
                            : 'border-zinc-600/50 bg-zinc-800/40 hover:border-zinc-500/70'
                          : selectedPkg === pkg.packageId
                            ? 'border-white/30 bg-white/8'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                        }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-2 left-3 whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                          {pkg.badge}
                        </span>
                      )}
                      {selectedPkg === pkg.packageId && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                      <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">{pkg.label}</p>
                      <p className="text-lg font-black text-white mt-0.5 leading-tight">
                        {pkg.sparkAmount.toLocaleString()}
                        <span className="text-xs font-normal text-zinc-500 ml-1">Spark</span>
                      </p>
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="font-mono font-bold text-white text-sm">${pkg.priceUsd}</p>
                        {avaxUsdPrice && (
                          <p className="font-mono text-[9px] text-zinc-600 mt-0.5">~{pkg.requiredAvaxFormatted} AVAX</p>
                        )}
                        {pkg.savingsPct > 0 && (
                          <p className="font-mono text-[9px] text-emerald-400 font-bold mt-0.5">Save {pkg.savingsPct}%</p>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Custom Amount Card */}
                  <button
                    type="button"
                    onClick={() => { setUseCustom(true); setSelectedPkg(null); }}
                    className={`relative flex flex-col p-3.5 rounded-xl border text-left transition-all
                      ${useCustom
                        ? 'border-white/30 bg-white/8'
                        : 'border-white/10 border-dashed bg-white/[0.02] hover:border-white/20'
                      }`}
                  >
                    {useCustom && (
                      <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Custom</p>
                    <p className="text-sm font-bold text-zinc-400 mt-1 leading-snug">Any amount</p>
                    <p className="font-mono text-[9px] text-zinc-600 mt-auto pt-2">$5 / 1,000 Spark</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Custom Amount Input */}
          <AnimatePresence>
            {useCustom && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Custom Spark amount</p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customSparks}
                        onChange={(e) => setCustomSparks(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 3500"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-white text-base md:text-lg placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500 uppercase">Spark</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0 self-center hidden sm:block" />
                    <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:min-w-[120px] text-right">
                      {customAvax ? (
                        <>
                          <p className="font-mono font-bold text-white text-base md:text-lg">{customAvax.toFixed(4)}</p>
                          <p className="font-mono text-[10px] text-zinc-500">AVAX · ${customUsd?.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="font-mono text-zinc-600 text-sm">— AVAX</p>
                      )}
                    </div>
                  </div>
                  {customSparksNum > 0 && customSparksNum < 1000 && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-500 font-mono">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Minimum purchase is 1,000 Spark ($5).
                    </p>
                  )}
                  {customSparksNum >= 1000 && (
                    <p className="font-mono text-[11px] text-zinc-500">
                      This will be processed as {Math.ceil(customSparksNum / 1000).toLocaleString()} × Starter packages.
                      You will receive <span className="text-white">{(Math.ceil(customSparksNum / 1000) * 1000).toLocaleString()} Spark</span>.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wallet + Buy Section */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
            {!session && (
              <div className="flex items-center gap-2 text-amber-500 font-mono text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                You must be logged in to purchase Spark.
              </div>
            )}

            {session && selectedPayment === 'avax' && (
              <>
                {!walletAddress ? (
                  <button
                    onClick={connectWallet}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet (Fuji Testnet)
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-xs text-zinc-400">Connected</span>
                    </div>
                    <span className="font-mono text-xs text-zinc-300">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                  </div>
                )}

                {error && (
                  <p className="flex items-start gap-2 text-sm text-primary font-mono bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}

                {walletAddress && (
                  <button
                    disabled={(!activePkg && !useCustom) || buyingId !== null || (useCustom && customSparksNum < 1000)}
                    onClick={() => activePkg && handleBuy(activePkg)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-black font-mono font-bold text-base uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {buyingId !== null ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        {activePkg
                          ? `Buy ${activePkg.sparkAmount.toLocaleString()} Spark — $${activePkg.priceUsd}`
                          : useCustom && customSparksNum >= 1000
                            ? `Buy ${(Math.ceil(customSparksNum / 1000) * 1000).toLocaleString()} Spark`
                            : 'Select a package'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {avaxUsdPrice && activePkg && (
                  <p className="text-center font-mono text-[11px] text-zinc-600">
                    AVAX/USD: ${avaxUsdPrice.toFixed(2)} via Chainlink · you pay ~{activePkg.requiredAvaxFormatted} AVAX
                  </p>
                )}
              </>
            )}

            {session && selectedPayment !== 'avax' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-zinc-500" />
                </div>
                <p className="font-mono font-bold text-white text-sm uppercase tracking-widest">Coming Soon</p>
                <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
                  {selectedPayment === 'moonpay'
                    ? 'MoonPay integration is on the roadmap. Buy Spark with any credit or debit card — no crypto wallet needed.'
                    : selectedPayment === 'card'
                    ? 'Direct card and bank transfer support via Stripe is in development.'
                    : 'Cross-chain payments via LayerZero — pay from any major chain.'}
                </p>
                <button
                  onClick={() => setSelectedPayment('avax')}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                >
                  Use AVAX wallet instead <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 pb-6">
            {[
              { icon: <Check className="w-3.5 h-3.5 text-emerald-400" />, text: 'No hidden fees' },
              { icon: <Zap className="w-3.5 h-3.5 text-primary" />, text: 'Instant balance update' },
              { icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, text: '10% rewards your bots' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                {icon}
                {text}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
