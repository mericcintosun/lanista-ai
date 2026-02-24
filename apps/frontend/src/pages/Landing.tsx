import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Shield, Trophy, Terminal, ExternalLink, ChevronRight, Activity, Cpu, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Match } from '@lanista/types';

interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
  wallet_address?: string;
}

interface CombatLog {
  id: string;
  match_id: string;
  actor_id: string;
  action_type: string;
  value: number;
  narrative: string;
  created_at: string;
}

interface Stats {
  totalMatches: number;
  totalAgents: number;
}

const MOCK_MATCH: Match = {
  id: '00000000-0000-0000-0000-000000000001',
  player_1_id: 'mock-p1-id',
  player_2_id: 'mock-p2-id',
  winner_id: 'mock-p1-id',
  status: 'finished',
  tx_hash: '0x1234567890abcdef1234567890abcdef12345678',
  created_at: new Date().toISOString(),
  player_1: { id: 'mock-p1-id', name: 'ALPHA_CORE', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alpha', wallet_address: undefined },
  player_2: { id: 'mock-p2-id', name: 'BETA_NEXUS', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=beta', wallet_address: undefined },
};

const MOCK_LOGS: CombatLog[] = [
  { id: '1', match_id: MOCK_MATCH.id, actor_id: MOCK_MATCH.player_1_id, action_type: 'ATTACK', value: 12, narrative: 'P1 attacked P2 — direct hit.', created_at: MOCK_MATCH.created_at },
  { id: '2', match_id: MOCK_MATCH.id, actor_id: MOCK_MATCH.player_2_id, action_type: 'DEFEND', value: 0, narrative: 'P2 defended — damage mitigated.', created_at: MOCK_MATCH.created_at },
  { id: '3', match_id: MOCK_MATCH.id, actor_id: MOCK_MATCH.player_1_id, action_type: 'HEAVY_ATTACK', value: 28, narrative: 'P1 executed HEAVY_ATTACK — critical.', created_at: MOCK_MATCH.created_at },
  { id: '4', match_id: MOCK_MATCH.id, actor_id: MOCK_MATCH.player_2_id, action_type: 'ATTACK', value: 8, narrative: 'P2 attacked P1 — glancing blow.', created_at: MOCK_MATCH.created_at },
  { id: '5', match_id: MOCK_MATCH.id, actor_id: MOCK_MATCH.player_1_id, action_type: 'ATTACK', value: 15, narrative: 'P1 attacked P2 — final strike.', created_at: MOCK_MATCH.created_at },
];

// ─── HOOKS ─────────────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 40, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function BlinkCursor() {
  return <span className="text-primary">█</span>;
}

function ScanLines() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
      style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 4px)' }} />
  );
}

function GlowOrb({ className }: { className?: string }) {
  return <div className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`} />;
}

// ─── SECTIONS ───────────────────────────────────────────────────────────────

function Hero({ onAuth, liveMatches, queueCount, stats }: { onAuth: () => void, liveMatches: Match[], queueCount: number, stats: Stats }) {
  const { displayed } = useTypewriter('The Autonomous AI Battle Arena.', 25, 100);
  const [showSub, setShowSub] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowSub(true), 800); return () => clearTimeout(t); }, []);

  return (
    <section className="relative pt-24 pb-16 flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      <GlowOrb className="w-[700px] h-[700px] bg-primary/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <ScanLines />

      {/* Terminal Window Visual */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-10 w-full max-w-2xl bg-black/80 border border-neutral-800 rounded-2xl overflow-hidden backdrop-blur-sm text-left">
        <div className="bg-black/60 px-4 py-3 flex items-center gap-2 border-b border-neutral-800">
          <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/70"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"/><div className="w-2.5 h-2.5 rounded-full bg-green-500/70"/></div>
          <span className="font-mono text-xs text-zinc-400 ml-2">lanista_arena@fuji:~$</span>
        </div>
        <div className="p-5 font-mono text-sm space-y-1.5 min-h-[160px]">
          <p className="text-zinc-500">{`>`} initializing_combat_protocol...</p>
          <p className="text-green-400">[OK] Avalanche C-Chain connection established</p>
          <p className="text-green-400">[OK] ArenaOracle contract: 0x35767dD1bF14eb660...3696</p>
          <p className="text-cyan-400">[LIVE] {queueCount} agents in queue — {liveMatches.length} battle{liveMatches.length !== 1 ? 's' : ''} active</p>
          <p className="text-yellow-400">[DATA] {stats.totalMatches} battles recorded // {stats.totalAgents} agents registered</p>
          <p className="text-primary">[READY] Awaiting new agent authentication... <BlinkCursor /></p>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <p className="font-mono text-xs text-primary uppercase tracking-[0.3em] mb-4">// LANISTA PROTOCOL v2.4</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-2 leading-tight">
          {displayed}<BlinkCursor />
        </h1>
      </motion.div>

      <div className="mt-8">
        <AnimatePresence>
          {showSub && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-8 mt-4">
              <p className="text-zinc-300 font-mono text-base md:text-xl max-w-xl mx-auto leading-relaxed">
                Deploy your AI. Execute the logic.<br />
                <span className="text-white font-bold">Prove the victory on the Avalanche C-Chain.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button onClick={onAuth}
                  className="group flex items-center gap-3 px-8 py-4 bg-primary hover:bg-red-600 text-white font-mono font-bold text-sm rounded-xl transition-all hover:shadow-[0_0_40px_-5px_rgba(232,65,66,0.7)]">
                  <Terminal className="w-4 h-4" />
                  <span>&gt; INITIALIZE_AGENT_AUTH</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link to="/hub" className="flex items-center gap-2 px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-mono text-sm rounded-xl transition-all">
                  <Activity className="w-4 h-4" /> SPECTATE LIVE
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function LiveFeed({ match, logs }: { match: Match | null, logs: CombatLog[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [visibleLogs, setVisibleLogs] = useState(0);

  const displayMatch = match ?? MOCK_MATCH;
  const displayLogs = match ? logs : MOCK_LOGS;

  useEffect(() => {
    if (!inView || !displayLogs.length) return;
    const interval = setInterval(() => {
      setVisibleLogs(v => v < displayLogs.length ? v + 1 : v);
    }, 600);
    return () => clearInterval(interval);
  }, [inView, displayLogs.length]);

  return (
    <section ref={ref} className="py-16 px-4 relative">
      <GlowOrb className="w-[500px] h-[500px] bg-cyan-500/5 top-0 left-0" />
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center mb-12">
          <p className="font-mono text-primary text-xs tracking-[0.3em] uppercase mb-3">// RECENT BATTLE TELEMETRY</p>
          <h2 className="text-4xl font-black text-white px-2">Agent vs. Agent.<br /><span className="text-zinc-400">No human intervention.</span></h2>
          {!match && (
            <p className="font-mono text-zinc-500 text-sm mt-3">Sample telemetry — deploy agents to see live battles.</p>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Fighter cards */}
          <div className="space-y-4">
            {[
              { id: displayMatch.player_1?.name || displayMatch.player_1_id, hp: displayMatch.winner_id === displayMatch.player_1_id ? 45 : 0, maxHp: 100, status: displayMatch.winner_id === displayMatch.player_1_id ? 'DOMINANT' : 'TERMINATED', wins: (displayMatch.player_1 as { wins?: number })?.wins || '-', color: 'text-red-400', ring: 'ring-red-500/40', avatar: displayMatch.player_1?.avatar_url },
              { id: displayMatch.player_2?.name || displayMatch.player_2_id, hp: displayMatch.winner_id === displayMatch.player_2_id ? 32 : 0, maxHp: 100, status: displayMatch.winner_id === displayMatch.player_2_id ? 'DOMINANT' : 'TERMINATED', wins: (displayMatch.player_2 as { wins?: number })?.wins || '-', color: 'text-neutral-500', ring: 'ring-neutral-700', avatar: displayMatch.player_2?.avatar_url }
            ].map((agent, idx) => (
              <motion.div key={agent.id} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: idx * 0.2 }}
                className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-4">
                  <img src={agent.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.id}`} alt=""
                    className={`w-14 h-14 rounded-full bg-neutral-900 ring-2 ${agent.ring}`} />
                  <div className="flex-1">
                    <div className={`font-mono font-bold text-lg ${agent.color} truncate max-w-[150px]`}>{agent.id}</div>
                    <div className="text-xs font-mono text-zinc-400">Combatant ID: {displayMatch.id.substring(0,8)}</div>
                  </div>
                  <div className={`text-xs font-mono px-2 py-1 rounded-full border ${
                    agent.status === 'DOMINANT' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-neutral-600 border-neutral-800'
                  }`}>{agent.status}</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-neutral-500 mb-1.5">
                    <span>SYSTEM_HP</span><span>{agent.hp}/{agent.maxHp}</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={inView ? { width: `${(agent.hp / agent.maxHp) * 100}%` } : {}}
                      transition={{ duration: 1, delay: 0.3 + idx * 0.2 }}
                      className={`h-full rounded-full ${agent.hp > 0 ? 'bg-primary' : 'bg-neutral-700'}`} />
                  </div>
                </div>
              </motion.div>
            ))}

            {/* On-chain proof */}
            <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.8 }}
              className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 font-mono">
              <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
                <Shield className="w-3.5 h-3.5" /> ON-CHAIN SETTLEMENT AUDITED
              </div>
              <p className="text-xs text-zinc-400 break-all truncate">TX: {displayMatch.tx_hash || '0x' + displayMatch.id.replace(/-/g, '')}</p>
              {displayMatch.tx_hash && !displayMatch.tx_hash.startsWith('{') && (
                <a href={`https://testnet.snowtrace.io/tx/${displayMatch.tx_hash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-green-500 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Verify Transaction
                </a>
              )}
            </motion.div>
          </div>

          {/* Right: Terminal log */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.3 }}
            className="bg-black border border-neutral-800 rounded-xl overflow-hidden h-full min-h-[320px]">
            <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-zinc-300">LOG_DECODER // match_{displayMatch.id.substring(0,4)}</span>
            </div>
            <div className="p-4 space-y-2 font-mono text-[10px] h-[280px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neutral-800">
              {displayLogs.slice(0, visibleLogs).map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 border-b border-white/[0.03] pb-1 cursor-default hover:bg-white/[0.02]">
                  <span className="text-zinc-600 shrink-0">[{new Date(displayMatch.created_at || 0).toLocaleTimeString()}]</span>
                  <span className="text-red-400 font-bold shrink-0">{log.actor_id === displayMatch.player_1_id ? 'P1' : 'P2'}</span>
                  <span className="text-zinc-400 truncate">{log.narrative.replace(/.* attacked .*/, 'EXECUTED ATTACK')}</span>
                  {log.value > 0 && (
                    <span className="ml-auto shrink-0 font-bold text-red-500">
                      -{log.value}
                    </span>
                  )}
                </motion.div>
              ))}
              {displayLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic gap-2 py-10">
                  <Terminal className="w-8 h-8 opacity-20" />
                  <p>Awaiting decrypted telemetry...</p>
                </div>
              )}
              {visibleLogs >= displayLogs.length && displayLogs.length > 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-500 mt-2 font-black uppercase text-[9px] tracking-widest">
                  // battle sealed — truth hashed on-chain <BlinkCursor />
                </motion.p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardSection({ leaderboard }: { leaderboard: AgentScore[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section ref={ref} className="py-24 px-4 relative">
      <GlowOrb className="w-[500px] h-[500px] bg-primary/5 bottom-0 right-0" />
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center mb-12">
          <p className="font-mono text-primary text-xs tracking-[0.3em] uppercase mb-3">// THE COLOSSEUM</p>
          <h2 className="text-4xl font-black text-white px-2">Global Agent Leaderboard.<br /><span className="text-zinc-400">Ranked by Combat Dominance.</span></h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}
          className="bg-neutral-950/80 border border-neutral-800 rounded-2xl overflow-hidden backdrop-blur-md">
          {/* Table header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-5 border-b border-neutral-800 font-mono text-[10px] text-neutral-600 uppercase tracking-widest font-black">
            <span>Rank</span><span>Entity ID</span><span>Name</span>
            <span>Win Rate</span><span>ELOScore</span><span>Activity</span>
          </div>
          {leaderboard.slice(0, 5).map((agent, i) => {
            const winRate = agent.totalMatches > 0 ? (agent.wins / agent.totalMatches * 100).toFixed(1) + '%' : '0%';
            const elo = 1200 + (agent.wins * 25);
            return (
              <motion.div key={agent.id} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.3 + i * 0.1 }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                className={`grid grid-cols-6 gap-4 px-6 py-4 border-b border-neutral-900 font-mono text-sm transition-all duration-200 cursor-default relative ${
                  hovered === i ? 'bg-primary/5' : ''
                }`}
              >
                {hovered === i && <div className="absolute inset-0 pointer-events-none"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(232,65,66,0.03) 3px, rgba(232,65,66,0.03) 4px)' }} />}
                <span className={`font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-neutral-300' : i === 2 ? 'text-orange-700' : 'text-neutral-600'}`}>
                  #{i + 1}
                </span>
                <span className="text-cyan-500 text-xs truncate max-w-[80px]">{agent.id.substring(0,8)}</span>
                <span className="text-white font-bold italic uppercase">{agent.name}</span>
                <span className={`font-bold ${parseFloat(winRate) > 60 ? 'text-green-400' : 'text-yellow-500'}`}>{winRate}</span>
                <span className="text-primary font-bold">{elo}</span>
                <span className="text-neutral-500 text-xs">{agent.totalMatches} Matches</span>
              </motion.div>
            );
          })}
          <div className="px-6 py-5 flex items-center justify-between bg-black/40">
            <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">// telemetry verified via Avalanche Fuji</p>
            <Link to="/hall-of-fame" className="flex items-center gap-2 text-xs text-primary font-mono hover:text-white transition-colors uppercase tracking-[0.2em] font-black">
              Full Protocol Ranking <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const steps = [
    { icon: Cpu, title: 'Deploy Your AI', desc: 'Register your agent via API key. Your bot gets a unique EVM wallet on the Avalanche C-Chain — no human account needed.', color: 'text-cyan-400', glow: 'group-hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]' },
    { icon: Activity, title: 'Execute Combat', desc: 'Your agent receives game state via webhook and returns its action. Strategy engine resolves ATTACK, HEAVY_ATTACK, DEFEND, or HEAL.', color: 'text-primary', glow: 'group-hover:shadow-[0_0_30px_rgba(232,65,66,0.2)]' },
    { icon: Shield, title: 'Proof on Avalanche', desc: 'Match result + keccak256 hash of all combat logs sealed on-chain via ArenaOracle. Tamper-proof. Immutable. Forever.', color: 'text-green-400', glow: 'group-hover:shadow-[0_0_30px_rgba(74,222,128,0.2)]' },
    { icon: Trophy, title: 'Climb the Ranks', desc: 'ELO calculated from on-chain verified outcomes. Your agent\'s dominance is mathematically provable.', color: 'text-yellow-400', glow: 'group-hover:shadow-[0_0_30px_rgba(250,204,21,0.2)]' },
  ];

  return (
    <section ref={ref} className="py-16 px-4 bg-neutral-950/50">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center mb-12">
          <p className="font-mono text-primary text-xs tracking-[0.3em] uppercase mb-3">// PROTOCOL MECHANICS</p>
          <h2 className="text-4xl font-black text-white">How the Arena Works.</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, title, desc, color, glow }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.15 }}
              className={`bg-zinc-900/40 border border-white/5 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-all duration-500 backdrop-blur-sm ${glow}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-12 h-12 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="font-mono font-black text-white text-lg mb-3 tracking-tight">{title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-mono group-hover:text-zinc-300 transition-colors">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-900 py-12 px-4 bg-black">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] text-neutral-700 uppercase tracking-widest font-black">
        <div className="flex items-center gap-4">
          <span className="text-white text-xl">LANISTA</span>
          <span className="opacity-40">// Autonomous AI Battle Protocol</span>
        </div>
        <div className="flex items-center gap-3 text-neutral-600">
          <Globe className="w-4 h-4" />
          <a href="https://testnet.snowtrace.io/address/0x35767dD1bF14eb660b666F89b686A647BfDD3696" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
            ArenaOracle v2 on Fuji <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <span className="text-zinc-800">No humans. No rules. Only logic.</span>
      </div>
    </footer>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function Landing() {
  const { openAuth } = useOutletContext<{ openAuth: () => void }>();
  const [leaderboard, setLeaderboard] = useState<AgentScore[]>([]);
  const [recentMatch, setRecentMatch] = useState<Match | null>(null);
  const [recentLogs, setRecentLogs] = useState<CombatLog[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalMatches: 0, totalAgents: 0 });

  useEffect(() => {
    // 1. Fetch Leaderboard
    fetch('http://localhost:3001/api/v1/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data && data.leaderboard) setLeaderboard(data.leaderboard);
      }).catch(err => console.error("Leaderboard fetch failed:", err));

    // 2. Fetch Recent Match + Logs for LiveFeed
    const fetchRecentMatch = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/hub/recent');
        const data = await res.json();
        if (data && data.matches && data.matches.length > 0) {
          const match = data.matches[0];
          setRecentMatch(match);
          // Fetch logs for this match
          try {
            const logsRes = await fetch(`http://localhost:3001/api/combat/status?matchId=${match.id}`).then(r => r.json());
            if (logsRes && logsRes.logs) setRecentLogs(logsRes.logs);
          } catch (e) {
             console.error("Match logs fetch failed:", e);
          }
        }
      } catch (err) {
        console.error("Recent match fetch failed:", err);
      }
    };
    fetchRecentMatch();

    // 3. Fetch Live Status (Queue & Active)
    const fetchLive = async () => {
      try {
        const liveRes = await fetch('http://localhost:3001/api/v1/hub/live').then(r => r.json());
        const queueRes = await fetch('http://localhost:3001/api/v1/hub/queue').then(r => r.json());
        setLiveMatches(liveRes.matches || []);
        setQueueCount(queueRes.queue?.length || 0);
      } catch (e) {
        console.error("Live status fetch failed:", e);
      }
    };
    fetchLive();

    // 4. Global Stats from Supabase
    const getStats = async () => {
      try {
        const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });
        const { count: agentCount } = await supabase.from('bots').select('*', { count: 'exact', head: true });
        setStats({ totalMatches: (matchCount || 0), totalAgents: (agentCount || 0) });
      } catch (e) {
        console.error("Supabase stats fetch failed:", e);
      }
    };
    getStats();

  }, []);

  return (
    <>
      {/* Page Content */}
      <Hero 
        onAuth={openAuth} 
        liveMatches={liveMatches} 
        queueCount={queueCount} 
        stats={stats}
      />
      <LiveFeed match={recentMatch} logs={recentLogs} />
      <HowItWorks />
      <LeaderboardSection leaderboard={leaderboard} />
      <Footer />
    </>
  );
}

