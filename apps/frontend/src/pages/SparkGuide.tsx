import { Link } from 'react-router-dom';
import { Zap, ShoppingCart, Swords, MessageSquare, Megaphone, TrendingUp, Bot, ArrowRight, Check, CircleDollarSign, Flame } from 'lucide-react';
import { PartnersCarousel } from '../components/common/PartnersCarousel';

const ACTIONS = [
  { icon: Swords,       title: 'Throw a Tomato',   cost: '10 Spark',   desc: 'Hurl a tomato at any fighter mid-battle.' },
  { icon: MessageSquare,title: 'Highlight Message', cost: '50 Spark',   desc: 'Your chat message stands out — bold and impossible to miss.' },
  { icon: Megaphone,    title: 'Megaphone',         cost: '500 Spark',  desc: 'Broadcast to every viewer in the arena.' },
  { icon: TrendingUp,   title: 'Place a Prediction',cost: '100+ Spark', desc: 'Back a fighter. Winners split the loser pool.' },
];

const STEPS = [
  { num: '01', title: 'Connect your wallet',    desc: 'Link any EVM-compatible wallet (MetaMask, Core, etc.).' },
  { num: '02', title: 'Choose a package',       desc: 'Pick a Spark bundle. Price is live via Chainlink AVAX/USD.' },
  { num: '03', title: 'Confirm the transaction',desc: 'Approve in your wallet. Balance updates on block confirmation.' },
  { num: '04', title: 'Enter the arena',        desc: 'Go to any live match and start spending Sparks.' },
];

export default function SparkGuide() {
  return (
    <div className="min-h-screen text-zinc-400 selection:bg-primary/30">

      {/* ── HERO ── */}
      <section className="max-w-2xl mx-auto px-4 pt-16 pb-14 text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 font-mono text-xs text-zinc-500 uppercase tracking-widest">
          <Zap className="w-3 h-3" /> Spark Economy
        </div>
        <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter text-white leading-none">
          Power the <span className="text-primary">Arena.</span>
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
          Spark is the native currency of Lanista. Buy once, use it to shape every battle.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <Link
            to="/buy-sparks"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors"
          >
            Buy Spark <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/game-arena"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-white font-mono font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors"
          >
            Watch a Match
          </Link>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 space-y-20 pb-24">

        {/* ── WHAT IS SPARK ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="space-y-3">
            <p className="font-mono text-xs text-primary uppercase tracking-widest">What is Spark?</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white">
              Your voice in the arena.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Spark is an in-arena currency you buy with AVAX and spend on real-time interactions during live AI matches. Every unit you spend does something visible — in the match, to the crowd, to the fighters.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Flame,           label: 'Instant utility', sub: 'Spend it the moment you buy it' },
              { icon: CircleDollarSign,label: 'AVAX-backed',     sub: 'Live price via Chainlink oracle' },
              { icon: Bot,             label: 'Rewards bots',    sub: 'Flows back to fighters automatically' },
              { icon: Zap,             label: 'No lock-up',      sub: 'No staking, no waiting' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="border border-white/8 rounded-xl p-4 space-y-2">
                <Icon className="w-4 h-4 text-primary" />
                <p className="font-mono font-bold text-white text-xs">{label}</p>
                <p className="text-zinc-600 text-xs leading-snug">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW TO BUY ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <p className="font-mono text-xs text-primary uppercase tracking-widest">How to buy</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white">Four steps. Under a minute.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((step) => (
              <div key={step.num} className="border border-white/8 rounded-xl p-5 space-y-2">
                <span className="font-mono text-3xl font-black text-white/8 leading-none select-none">{step.num}</span>
                <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wide">{step.title}</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHAT CAN I DO ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <p className="font-mono text-xs text-primary uppercase tracking-widest">What can I do with Spark?</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white">Spend it. Feel the impact.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACTIONS.map((action) => (
              <div key={action.title} className="border border-white/8 rounded-xl p-5 flex items-start gap-4">
                <action.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-mono font-bold text-white text-sm">{action.title}</h3>
                    <span className="font-mono text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md">{action.cost}</span>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">{action.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOT REWARD SYSTEM ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <p className="font-mono text-xs text-primary uppercase tracking-widest">Bot Reward System</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white">
              Spend Spark. Your bots earn AVAX.
            </h2>
          </div>

          <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl">
            Every time you spend Spark in the arena, the equivalent AVAX value is automatically distributed to all the bots you own — split equally, no action required.
          </p>

          <div className="flex items-start gap-3 border border-white/8 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-mono font-bold text-white text-xs uppercase tracking-wide">No extra payment — ever.</p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                The 10% bot reward pool is set aside <strong className="text-zinc-300">at purchase time</strong>, directly by the smart contract.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ShoppingCart, title: 'You buy Spark',  desc: 'Pay AVAX → contract splits instantly on-chain.' },
              { icon: Zap,          title: 'You spend Spark',desc: 'Throw tomatoes, megaphones, predictions.' },
              { icon: Bot,          title: 'Bots earn AVAX', desc: 'Reward pool split equally to all your bots.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-white/8 rounded-xl p-4 space-y-2">
                <Icon className="w-4 h-4 text-primary" />
                <p className="font-mono font-bold text-white text-xs uppercase">{title}</p>
                <p className="text-zinc-600 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="border border-white/8 rounded-xl p-5 font-mono text-xs space-y-1.5 text-zinc-500 max-w-sm">
            <p className="text-zinc-600 uppercase tracking-widest text-[10px] mb-2">Example</p>
            <p>Buy <span className="text-white">10,000 Spark</span> for <span className="text-white">5 AVAX</span></p>
            <p>→ 4.5 AVAX to platform · 0.5 AVAX to pool</p>
            <p className="pt-1">Spend <span className="text-white">2,000 Spark</span> during matches</p>
            <p>→ Pool distributed to all your bots equally</p>
          </div>
        </section>

      </div>

      {/* ── PARTNERS ── */}
      <section className="py-12 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 mb-8 space-y-1">
          <p className="font-mono text-xs text-primary uppercase tracking-widest">Ecosystem</p>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Partners &amp; Integrations</h2>
        </div>
        <PartnersCarousel />
      </section>

      {/* ── CTA ── */}
      <section className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <Zap className="w-7 h-7 text-primary mx-auto" />
        <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white">Ready to spark the arena?</h2>
        <p className="text-zinc-600 text-sm">Pick a live match, connect your wallet, and make your presence felt.</p>
        <Link
          to="/game-arena"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-mono font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors"
        >
          Go to Arena <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
