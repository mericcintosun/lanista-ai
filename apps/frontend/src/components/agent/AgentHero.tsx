import { useState, useEffect } from 'react';
import { Shield, BadgeCheck } from 'lucide-react';
import { TierProgressBar } from '../EloTier';
import { RankIcon } from '../RankIcon';
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
  const [passport, setPassport] = useState<any>(null);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);
  const isOwner = !!session && (agent as any).owner_id === session.user.id;

  const elo = agent.elo ?? 0;
  const totalMatches = passport?.totalMatches ?? agent.true_total_matches ?? agent.total_matches ?? history.filter(m => m.status === 'finished').length;
  const wins = passport?.wins ?? agent.true_wins ?? history.filter(m => m.status === 'finished' && m.winner_id === agent.id).length;
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

  const passportPills = [
    { label: 'Passport', value: passport?.tokenId ? `#${passport.tokenId}` : '—' },
    { label: 'Honor', value: passport?.reputationScore ?? '—' },
    { label: 'Rank', value: tier.name, rankForIcon: tier.name },
    { label: 'ELO', value: String(elo) },
    { label: 'Battles', value: String(totalMatches) },
    { label: 'W', value: String(wins), color: '#34d399' },
  ];
  const enrolledDate = agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: 'rgba(15,15,17,0.6)', border: '1px solid rgba(34,34,38,0.8)' }}
      >
        <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${accent}00 0%, ${accent} 50%, ${accent}00 100%)` }} />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.06, filter: 'blur(56px)', transform: 'translate(15%, -15%)' }} />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.03, filter: 'blur(40px)', transform: 'translate(-50%, 20%)' }} />

        <div className="relative z-10 p-5 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr_minmax(0,200px)] gap-6 lg:gap-8 items-stretch">
            {/* Left: Identity */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 sm:gap-5 lg:gap-5">
              <div className="flex items-start gap-4 sm:gap-5 lg:flex-col lg:items-start">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1.5 rounded-2xl pointer-events-none" style={{ background: accent, opacity: 0.15, filter: 'blur(10px)' }} />
                  <img
                    src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                    alt={agent.name}
                    className="rounded-2xl object-cover relative ring-2 ring-white/5 w-24 h-24 sm:w-28 sm:h-28"
                    style={{ border: `2px solid ${accent}50` }}
                  />
                </div>
                <div className="min-w-0 flex-1 lg:flex-initial space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight leading-tight">{agent.name}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase" style={{ background: `${accent}20`, border: `1px solid ${accent}50`, color: accent }}>
                      <RankIcon rank={tier.name} size={14} strokeWidth={2.5} className="shrink-0" />
                      {tier.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                  {agent.description && (
                    <p className="text-zinc-500 text-sm italic leading-snug line-clamp-2">"{agent.description}"</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <AgentBalance address={agent.wallet_address} initialBalance={agent.avax_balance} />
                    {isOwner && session && !claimedTx && (agent as any).pending_reward_wei && BigInt((agent as any).pending_reward_wei ?? '0') > 0n && (
                      <ClaimRewardButton botId={agent.id} pendingRewardWei={(agent as any).pending_reward_wei} accessToken={session.access_token} onClaimed={(tx) => setClaimedTx(tx)} />
                    )}
                    {claimedTx && <ClaimRewardSuccess txHash={claimedTx} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Digital Passport */}
            <div className="flex flex-col min-h-0 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
                  <Shield className="w-4 h-4 shrink-0" style={{ color: accent }} />
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Digital Passport</span>
              </div>
              <div
                className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 py-5 px-5 sm:py-6 sm:px-6 rounded-xl min-h-[120px]"
                style={{ background: 'rgba(10,10,12,0.5)', border: '1px solid rgba(30,30,34,0.7)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
              >
                {passportPills.map((p) => (
                  <div key={p.label} className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{p.label}</span>
                    <span className="text-base font-bold font-mono tabular-nums leading-none inline-flex items-center gap-2" style={{ color: p.color ?? 'inherit' }}>
                      {'rankForIcon' in p && p.rankForIcon ? (
                        <>
                          <RankIcon rank={p.rankForIcon} size={18} strokeWidth={2.5} className="shrink-0" style={{ color: accent }} />
                          <span style={{ color: accent }}>{p.value}</span>
                        </>
                      ) : (
                        <span style={{ color: p.color ?? '#fff' }}>{p.value}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="flex items-center justify-between gap-4 mt-4 py-3 px-4 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(26,26,30,0.6)' }}
              >
                <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider truncate" title={agent.id}>{agent.id}</span>
                <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.25em] shrink-0">LANISTA · ARENA</span>
              </div>
            </div>

            {/* Right: RANK top-right (framed), ENROLLED bottom-right */}
            <div className="flex flex-col justify-between items-end lg:min-h-[200px] min-w-0 w-full max-w-full">
              <div
                className="w-full max-w-[320px] lg:max-w-[300px] rounded-xl px-5 py-5 min-h-[140px] flex flex-col gap-5 min-w-0"
                style={{
                  background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 50%, transparent 100%)`,
                  border: `1px solid ${accent}40`,
                  boxShadow: `0 0 0 1px ${accent}15 inset, 0 4px 20px ${accent}20, 0 0 40px ${accent}12`,
                }}
              >
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: `${accent}25`, boxShadow: `0 0 12px ${accent}30` }}>
                    <Shield className="w-5 h-5 shrink-0" style={{ color: accent }} />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: accent }}>
                    Arena Rank
                  </span>
                </div>
                <div className="min-w-0 w-full flex-1 flex flex-col justify-center">
                  <TierProgressBar elo={elo} hasPlayed={totalMatches > 0} hideEloLabel labelBelowBar />
                </div>
              </div>
              <div className="text-right mt-4 lg:mt-0">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Enrolled</span>
                <span className="text-base font-bold font-mono" style={{ color: accent }}>{enrolledDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
