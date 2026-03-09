import { useState, useEffect } from 'react';
import { Shield, Fingerprint, Check, Copy, Trophy, Swords, Target, BadgeCheck, Zap } from 'lucide-react';
import { TierBadge, TierProgressBar } from '../EloTier';
import { getEloTier } from '../../lib/elo';
import { AgentBalance } from './AgentBalance';
import { ClaimRewardButton, ClaimRewardSuccess } from './ClaimRewardButton';
import { API_URL } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import type { BotData } from '../../types';

interface AgentHeroProps {
  agent: BotData;
  history: any[];
}

export function AgentHero({ agent, history }: AgentHeroProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [passport, setPassport] = useState<any>(null);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);
  const isOwner = !!session && (agent as any).owner_id === session.user.id;

  const elo = agent.elo ?? 0;
  const wins = agent.true_wins ?? history.filter(m => m.status === 'finished' && m.winner_id === agent.id).length;
  const totalMatches = agent.true_total_matches ?? agent.total_matches ?? history.filter(m => m.status === 'finished').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const tier = getEloTier(elo, totalMatches > 0);

  // Tier-specific accent color (CSS value for inline styles)
  const tierAccentMap: Record<string, string> = {
    MASTER:   '#d946ef',
    DIAMOND:  '#22d3ee',
    PLATINUM: '#34d399',
    GOLD:     '#eab308',
    SILVER:   '#a1a1aa',
    BRONZE:   '#ea580c',
    IRON:     '#71717a',
  };
  const accent = tierAccentMap[tier.name] ?? '#71717a';

  useEffect(() => {
    if (!agent.id) return;
    fetch(`${API_URL}/agents/${agent.id}/passport`)
      .then(res => res.json())
      .then(data => { if (data.passport) setPassport(data.passport); })
      .catch(() => {});
  }, [agent.id]);

  const copy = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const shortId = agent.id ? agent.id.substring(0, 8).toUpperCase() : '—';

  return (
    <div className="space-y-3">

      {/* ══ HERO CARD ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
        style={{ background: '#111113', border: '1px solid #222226' }}
      >
        {/* Tier glow blob — top right */}
        <div
          className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: accent, opacity: 0.06, filter: 'blur(64px)', transform: 'translate(30%, -30%)' }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">

          {/* Avatar */}
          <div className="shrink-0 relative self-start sm:self-auto">
            <div
              className="absolute -inset-1 rounded-2xl pointer-events-none"
              style={{ background: accent, opacity: 0.15, filter: 'blur(10px)' }}
            />
            <img
              src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
              alt={agent.name}
              className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl object-cover relative"
              style={{ border: `2px solid ${accent}40` }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight leading-none">
                {agent.name}
              </h1>
              {agent.description && (
                <p className="text-zinc-500 text-xs italic mt-1 truncate max-w-sm">
                  "{agent.description}"
                </p>
              )}
            </div>

            {/* Pill tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* ID */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
              >
                <Fingerprint className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="font-mono text-[11px] text-zinc-300 tracking-wider">ID: {shortId}</span>
                <button
                  onClick={() => copy(agent.id, setCopiedId)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors ml-0.5"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* AVAX */}
              <AgentBalance address={agent.wallet_address} initialBalance={agent.avax_balance} />

              {/* Date */}
              {agent.created_at && (
                <div
                  className="px-2.5 py-1 rounded-lg font-mono text-[11px] text-zinc-400"
                  style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                >
                  {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </div>
              )}

              {/* Claim / Success */}
              {isOwner && session && !claimedTx && (agent as any).pending_reward_wei && BigInt((agent as any).pending_reward_wei ?? '0') > 0n && (
                <ClaimRewardButton
                  botId={agent.id}
                  pendingRewardWei={(agent as any).pending_reward_wei}
                  accessToken={session.access_token}
                  onClaimed={(tx) => setClaimedTx(tx)}
                />
              )}
              {claimedTx && <ClaimRewardSuccess txHash={claimedTx} />}
            </div>
          </div>

          {/* Tier badge — right side on desktop, hidden on mobile (shown in stats) */}
          <div className="hidden sm:flex shrink-0">
            <TierBadge elo={elo} hasPlayed={totalMatches > 0} prominent />
          </div>
        </div>
      </div>

      {/* ══ STATS ROW ══════════════════════════════════════════════════════ */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 rounded-xl overflow-hidden"
        style={{ border: '1px solid #222226' }}
      >
        {[
          { icon: <Trophy className="w-3.5 h-3.5" style={{ color: accent }} />, value: elo, label: 'ELO', valueColor: accent },
          { icon: <Swords className="w-3.5 h-3.5" style={{ color: accent }} />, value: totalMatches, label: 'Matches', valueColor: '#ffffff' },
          { icon: <Target className="w-3.5 h-3.5 text-emerald-400" />, value: `${winRate}%`, label: 'Win Rate', valueColor: '#34d399' },
          {
            icon: <Shield className="w-3.5 h-3.5" style={{ color: accent }} />,
            value: <span className="flex items-center gap-1">
              <span className="text-emerald-400">{wins}</span>
              <span className="text-zinc-600">–</span>
              <span style={{ color: accent, opacity: 0.8 }}>{totalMatches - wins}</span>
            </span>,
            label: 'W / L',
            valueColor: undefined,
          },
        ].map((stat, i, arr) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center py-4 px-3 gap-1 group hover:brightness-110 transition-all"
            style={{
              background: '#111113',
              borderRight: i < arr.length - 1 ? '1px solid #222226' : undefined,
              borderBottom: i < 2 ? '1px solid #222226' : undefined,
            }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {stat.icon}
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <span
              className="text-xl font-black tabular-nums leading-none"
              style={stat.valueColor ? { color: stat.valueColor } : {}}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ══ PASSPORT + TIER PROGRESS ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">

        {/* ── ID CARD ── */}
        <div
          className="sm:col-span-8 rounded-2xl overflow-hidden relative"
          style={{ background: '#0f0f11', border: '1px solid #222226' }}
        >
          {/* Top accent line */}
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}00 0%, ${accent} 40%, ${accent}00 100%)` }} />
          
          {/* Glow blob */}
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: accent, opacity: 0.05, filter: 'blur(50px)', transform: 'translate(20%, -20%)' }}
          />

          <div className="relative z-10 p-4 sm:p-5">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
                >
                  <Shield className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-widest leading-none">Digital Passport</p>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mt-0.5">Lany Identity · On-Chain</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
                style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
              >
                <BadgeCheck className="w-3.5 h-3.5" style={{ color: accent }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: accent }}>Verified</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex gap-4">
              {/* Photo column */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ width: 64, height: 76, border: `2px solid ${accent}40` }}
                >
                  <img
                    src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className="w-full text-center px-1 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider font-bold"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}25`, color: accent }}
                >
                  {tier.icon} {tier.name}
                </div>
              </div>

              {/* Fields grid */}
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2.5 min-w-0">
                {[
                  { label: 'Agent Name', value: agent.name, color: '#ffffff', bold: true },
                  { label: 'Passport #', value: passport?.tokenId ? `#${passport.tokenId}` : '—', color: accent },
                  { label: 'Honor Score', value: passport?.reputationScore ?? '—', color: accent },
                  { label: 'Battles', value: totalMatches, color: '#ffffff' },
                  { label: 'Victories', value: wins, color: '#34d399' },
                  { label: 'Enrolled', value: agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#a1a1aa' },
                ].map((f) => (
                  <div key={f.label}>
                    <span className="block text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">{f.label}</span>
                    <span
                      className="text-sm font-bold italic truncate block leading-tight"
                      style={{ color: f.color }}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barcode footer */}
            <div
              className="mt-4 pt-2.5 flex items-center justify-between"
              style={{ borderTop: '1px solid #222226' }}
            >
              <span className="font-mono text-[8px] text-zinc-700 uppercase tracking-[0.25em] truncate max-w-[70%]">
                {agent.id}
              </span>
              <span className="font-mono text-[8px] text-zinc-700 uppercase tracking-widest shrink-0">LANISTA · ARENA</span>
            </div>
          </div>
        </div>

        {/* ── TIER PROGRESS ── */}
        <div
          className="sm:col-span-4 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 relative overflow-hidden"
          style={{ background: '#0f0f11', border: '1px solid #222226' }}
        >
          {/* Glow */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: accent, opacity: 0.07, filter: 'blur(40px)' }}
          />
          <div className="relative z-10 flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" style={{ color: accent }} />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Arena Rank</span>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <TierProgressBar elo={elo} hasPlayed={totalMatches > 0} />
          </div>

          <p className="relative z-10 text-[10px] font-mono text-zinc-600 uppercase tracking-widest text-center">
            Progression Status
          </p>
        </div>

      </div>
    </div>
  );
}
