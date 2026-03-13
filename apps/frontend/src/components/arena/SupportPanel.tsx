import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Match } from '@lanista/types';
import { Zap, Lock, AlertCircle, X, TrendingUp, Shield, Trophy } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';
import { useSupportPools } from '../../hooks/useSupportPools';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

/* ── Colour tokens ────────────────────────────────────────────────────────── */
const FIRE = { b: '#f0894e', dim: 'rgba(240,137,78,0.18)', ring: 'rgba(240,137,78,0.45)' };
const SKY  = { b: '#5bb3f5', dim: 'rgba(91,179,245,0.18)', ring: 'rgba(91,179,245,0.45)' };
const SAGE = { b: '#8ed468', dim: 'rgba(142,212,104,0.15)', ring: 'rgba(142,212,104,0.35)' };

const AMOUNTS = [100, 500, 1_000, 5_000];

interface SupportPanelProps { match: Match; disabled?: boolean }

function computeMultipliers(p1: number = 1200, p2: number = 1200) {
  if (p1 === p2) return { p1: 1.0, p2: 1.0, p1Under: false, p2Under: false };
  const MAX = 2.0;
  if (p1 < p2) {
    const m = 1 + Math.min((p2 - p1) / 100, 1) * (MAX - 1);
    return { p1: +m.toFixed(2), p2: 1.0, p1Under: true, p2Under: false };
  }
  const m = 1 + Math.min((p1 - p2) / 100, 1) * (MAX - 1);
  return { p1: 1.0, p2: +m.toFixed(2), p1Under: false, p2Under: true };
}

export function SupportPanel({ match, disabled }: SupportPanelProps) {
  const [side, setSide] = useState<'p1' | 'p2' | null>(null);
  const [amount, setAmount] = useState('100');
  const [submitting, setSubmitting] = useState(false);
  const [modalFor, setModalFor] = useState<'p1' | 'p2' | null>(null);

  const { session } = useAuthStore();
  const { bluePool, greenPool, setBluePool, setGreenPool } = useSupportPools(match.id);

  const mults = useMemo(() => computeMultipliers(match.player_1?.elo, match.player_2?.elo), [match.player_1?.elo, match.player_2?.elo]);
  const totalPool = bluePool + greenPool;
  const p1Pct = totalPool === 0 ? 50 : Math.round((bluePool / totalPool) * 100);
  const p2Pct = 100 - p1Pct;

  useLockBodyScroll(!!modalFor);
  useEffect(() => {
    if (!modalFor) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalFor(null); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [modalFor]);

  const handleSubmit = async () => {
    if (!session?.user?.id) { toast.error('Login required'); return; }
    if (!side) { toast.error('Pick a fighter first'); return; }
    const n = parseInt(amount);
    if (isNaN(n) || n < 100) { toast.error('Minimum 100 Sparks'); return; }
    if (match.status === 'finished' || match.status === 'aborted') { toast.error('Match is over'); return; }

    setSubmitting(true);
    try {
      const type = side === 'p1' ? 'support_player_1' : 'support_player_2';
      const res = await fetch(`${API_URL}/sparks/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount: n, type, reference_id: match.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`Backing ${side === 'p1' ? match.player_1?.name : match.player_2?.name} with ${n} ⚡`);
      if (side === 'p1') setBluePool(p => p + n);
      else setGreenPool(p => p + n);
      setAmount('100');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Pool voided ── */
  if (match.is_pool_voided) {
    return (
      <div className="rounded-2xl p-6 text-center flex flex-col items-center gap-4"
        style={{ background: '#111116', border: `1px solid ${FIRE.ring}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: FIRE.dim, border: `1px solid ${FIRE.ring}` }}>
          <AlertCircle className="w-6 h-6" style={{ color: FIRE.b }} />
        </div>
        <div>
          <p className="font-black text-base text-white uppercase italic tracking-tight mb-1">Pool Voided</p>
          <p className="text-sm text-white/50 leading-relaxed">
            Match was unmatched — your Sparks were <span className="font-bold" style={{ color: FIRE.b }}>refunded</span>.
          </p>
        </div>
      </div>
    );
  }

  const modalBot = modalFor === 'p1' ? match.player_1 : match.player_2;
  const modalPool = modalFor === 'p1' ? bluePool : greenPool;
  const modalMult = modalFor === 'p1' ? mults.p1 : mults.p2;
  const modalUnder = modalFor === 'p1' ? mults.p1Under : mults.p2Under;

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* ── Top fire accent ── */}
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${SKY.b}, ${FIRE.b})` }} />

        <div className="p-4 sm:p-5 space-y-5">

          {/* ── Section label ── */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.25em]" style={{ color: FIRE.b }}>
              ⚔ Pick Your Fighter
            </span>
            {side && (
              <button className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest"
                onClick={() => setSide(null)}>
                Clear
              </button>
            )}
          </div>

          {/* ── PLAYER PICKER — big cards ── */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'p1' as const, bot: match.player_1, pool: bluePool, pct: p1Pct, mult: mults.p1, under: mults.p1Under, c: SKY },
              { key: 'p2' as const, bot: match.player_2, pool: greenPool, pct: p2Pct, mult: mults.p2, under: mults.p2Under, c: FIRE },
            ]).map(({ key, bot, pool, pct, mult, under, c }) => {
              const selected = side === key;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => !disabled && setSide(selected ? null : key)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                      e.preventDefault();
                      setSide(selected ? null : key);
                    }
                  }}
                  className={`relative flex flex-col items-center gap-2.5 p-3 sm:p-4 rounded-2xl text-center transition-all duration-200 group w-full ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    background: selected ? c.dim : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${selected ? c.b : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: selected ? `0 0 20px ${c.ring}` : 'none',
                  }}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={bot?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot?.name || key}`}
                      alt={bot?.name || key}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover"
                      style={{ border: `2px solid ${selected ? c.b : 'rgba(255,255,255,0.1)'}` }}
                    />
                    {selected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-black text-[10px] font-black"
                        style={{ background: c.b }}>✓</div>
                    )}
                  </div>

                  {/* Name */}
                  <p className="font-black text-sm sm:text-base uppercase italic tracking-tight leading-tight text-white group-hover:scale-105 transition-transform w-full truncate px-4">
                    {bot?.name || (key === 'p1' ? 'Fighter 1' : 'Fighter 2')}
                  </p>

                  {/* Pool + boost */}
                  <div className="space-y-1 w-full shrink-0">
                    <p className="font-mono text-xs font-bold" style={{ color: c.b }}>
                      {pool.toLocaleString()} ⚡ · {pct}%
                    </p>
                    {under && (
                      <div className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold mx-auto w-fit"
                        style={{ background: 'rgba(240,137,78,0.2)', color: '#f0894e' }}>
                        <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{mult}× boost</span>
                      </div>
                    )}
                  </div>

                  {/* Info btn */}
                  <button
                    type="button"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer group/infobtn"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    onClick={e => { e.stopPropagation(); setModalFor(key); }}
                  >
                    <span className="text-[10px] font-black text-white/50 group-hover/infobtn:text-white transition-colors">i</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Pool bar ── */}
          <div>
            <div className="h-2.5 rounded-full overflow-hidden flex"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="transition-all duration-700 rounded-l-full" style={{ width: `${p1Pct}%`, background: SKY.b }} />
              <div className="transition-all duration-700 rounded-r-full" style={{ width: `${p2Pct}%`, background: FIRE.b }} />
            </div>
            <div className="flex justify-between mt-1.5 font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span style={{ color: SKY.b }}>{match.player_1?.name?.split(' ')[0]} · {p1Pct}%</span>
              <span className="text-white/25">{totalPool.toLocaleString()} total ⚡</span>
              <span style={{ color: FIRE.b }}>{p2Pct}% · {match.player_2?.name?.split(' ')[0]}</span>
            </div>
          </div>

          {/* ── Amount + Submit ── */}
          <div className="space-y-3">
            {/* Quick amount pills */}
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map(a => (
                <button key={a}
                  onClick={() => setAmount(a.toString())}
                  disabled={!!disabled || !side || submitting}
                  className="py-2 rounded-xl text-xs font-mono font-black uppercase transition-all disabled:opacity-25"
                  style={{
                    background: amount === a.toString() && side
                      ? (side === 'p1' ? SKY.dim : FIRE.dim)
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${amount === a.toString() && side ? (side === 'p1' ? SKY.ring : FIRE.ring) : 'rgba(255,255,255,0.07)'}`,
                    color: amount === a.toString() && side ? (side === 'p1' ? SKY.b : FIRE.b) : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {a >= 1000 ? `${a / 1000}k` : a}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: side ? (side === 'p1' ? SKY.b : FIRE.b) : 'rgba(255,255,255,0.25)' }} />
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={!!disabled || !side || submitting}
                className="w-full rounded-xl py-3 pl-9 pr-4 text-sm font-mono text-white font-bold placeholder-white/20 focus:outline-none disabled:opacity-40 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${side ? (side === 'p1' ? SKY.ring : FIRE.ring) : 'rgba(255,255,255,0.1)'}`,
                }}
                placeholder="Custom amount"
                min="100" step="100"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!!disabled || !side || submitting}
              className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: !side || disabled ? 'rgba(255,255,255,0.06)' : (side === 'p1' ? SKY.b : FIRE.b),
                color: !side || disabled ? 'rgba(255,255,255,0.3)' : '#0a0a0b',
                boxShadow: side && !disabled ? `0 0 18px ${side === 'p1' ? SKY.ring : FIRE.ring}` : 'none',
              }}
            >
              {submitting
                ? <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-transparent animate-spin" />
                : <Lock className="w-4 h-4" />
              }
              {submitting ? 'Processing…' : side ? `Back ${side === 'p1' ? match.player_1?.name : match.player_2?.name}` : 'Select a fighter first'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Modal ── */}
      {modalFor && modalBot && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setModalFor(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-4 p-5 border-b border-white/[0.06]">
              <img
                src={modalBot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${modalBot.name}`}
                alt={modalBot.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
                style={{ border: `2px solid ${modalFor === 'p1' ? SKY.b : FIRE.b}` }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-0.5">Fighter Stats</p>
                <p className="font-black text-lg text-white uppercase italic tracking-tight truncate">{modalBot.name}</p>
              </div>
              <button onClick={() => setModalFor(null)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* W / L / Reputation */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Wins', value: modalBot.wins || 0, color: SAGE.b, icon: <Trophy className="w-4 h-4" /> },
                  { label: 'Losses', value: (modalBot.total_matches || 0) - (modalBot.wins || 0), color: 'rgba(255,255,255,0.4)', icon: null },
                  { label: 'ELO', value: Math.round(modalBot.elo || 1200), color: FIRE.b, icon: <Shield className="w-4 h-4" /> },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {s.icon && <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>}
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Reputation */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: FIRE.dim, border: `1px solid ${FIRE.ring}` }}>
                <span className="font-mono text-xs uppercase tracking-widest text-white/50">Reputation Score</span>
                <span className="font-black text-xl" style={{ color: FIRE.b }}>{modalBot.reputation_score || 0}</span>
              </div>

              {/* Pool backed + boost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Backed</span>
                  <span className="font-black text-sm" style={{ color: FIRE.b }}>{modalPool.toLocaleString()} ⚡</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: modalUnder ? FIRE.dim : 'rgba(255,255,255,0.04)', border: `1px solid ${modalUnder ? FIRE.ring : 'rgba(255,255,255,0.07)'}` }}>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Boost</span>
                  <span className="font-black text-sm" style={{ color: modalUnder ? FIRE.b : 'rgba(255,255,255,0.4)' }}>{modalMult.toFixed(2)}×</span>
                </div>
              </div>

              {/* Formula note */}
              <p className="font-mono text-[10px] text-white/25 text-center leading-relaxed">
                Reputation = (Wins × 10) − (Losses × 5) + Streak Bonus<br />
                Results anchored on Avalanche blockchain.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
