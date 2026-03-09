import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Swords, ExternalLink, Shield, BadgeCheck } from 'lucide-react';
import { API_URL } from '../lib/api';
import { getEloTier, ELO_TIERS } from '../lib/elo';
import { TierBadge } from '../components/EloTier';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <g>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </g>
  </svg>
);

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`${API_URL}/user/profile/public/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error('Profile not found');
        return res.json();
      })
      .then((data) => setProfile(data.profile))
      .catch(() => setError('Profile not found'))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <span className="font-mono text-xl sm:text-2xl uppercase tracking-[0.2em] text-zinc-400 font-bold">Decrypting Profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
        <p className="font-mono text-zinc-500 uppercase tracking-wider mb-4">Profile not found</p>
        <Link to="/" className="text-primary hover:underline font-mono text-sm uppercase">
          Return home
        </Link>
      </div>
    );
  }

  const agents = profile.agents || [];
  const activeAgents = profile.activeAgents ?? agents.length;
  const userRole = activeAgents > 0 ? 'commander' : 'observer';
  
  let highestElo = 0;
  agents.forEach((agent: any) => {
    const elo = agent.elo ?? 1200;
    if (elo > highestElo) highestElo = elo;
  });

  const totalMatchSum = profile.totalMatches ?? 0;
  const apiRank = profile.rank;
  const rankTier = apiRank
    ? (ELO_TIERS.find(t => t.name === apiRank) ?? getEloTier(highestElo, totalMatchSum > 0))
    : getEloTier(highestElo, totalMatchSum > 0);

  const tierAccentMap: Record<string, string> = {
    MASTER:   '#d946ef',
    DIAMOND:  '#22d3ee',
    PLATINUM: '#34d399',
    GOLD:     '#eab308',
    SILVER:   '#a1a1aa',
    BRONZE:   '#ea580c',
    IRON:     '#71717a',
  };
  const accent = tierAccentMap[rankTier.name] ?? '#71717a';

  return (
    <div className="pb-24 space-y-3 max-w-6xl mx-auto px-4 sm:px-6 relative pt-4">
      {/* ══ HERO CARD ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
        style={{ background: '#111113', border: '1px solid #222226' }}
      >
        {/* Tier glow blob — top right */}
        {userRole === 'commander' && (
          <div
            className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: accent, opacity: 0.06, filter: 'blur(64px)', transform: 'translate(30%, -30%)' }}
          />
        )}

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          {/* Avatar */}
          <div className="shrink-0 relative self-start sm:self-auto">
            {userRole === 'commander' && (
              <div
                className="absolute -inset-1 rounded-2xl pointer-events-none"
                style={{ background: accent, opacity: 0.15, filter: 'blur(10px)' }}
              />
            )}
            <img
              src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.publicUsername}`}
              alt="Avatar"
              className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl object-cover relative"
              style={{ border: userRole === 'commander' ? `2px solid ${accent}40` : '2px solid #2a2a2e' }}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between items-start gap-4">
            {/* Info */}
            <div className="space-y-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight leading-none">
                  {profile.callsign || 'PLAYER'}
                </h1>
              </div>

              {/* Pill tags */}
              <div className="flex flex-wrap items-center gap-1.5">
                {profile.xUrl && (
                  <a
                    href={profile.xUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:border-zinc-500 transition-colors"
                    style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                  >
                    <XIcon className="w-3 h-3 fill-zinc-400" />
                    <span className="font-mono text-[11px] text-zinc-400 tracking-wider">X.COM</span>
                  </a>
                )}
                {profile.discordUrl && (
                  <a
                    href={profile.discordUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:border-indigo-500/50 transition-colors"
                    style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                  >
                    <span className="font-mono text-[11px] text-zinc-400 tracking-wider">DISCORD</span>
                  </a>
                )}
                {profile.websiteUrl && (
                  <a
                    href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:border-cyan-500/50 transition-colors"
                    style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                  >
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                    <span className="font-mono text-[11px] text-zinc-400 tracking-wider">WEBSITE</span>
                  </a>
                )}
              </div>
              {profile.bio && (
                <p className="text-zinc-400 text-sm italic mt-2 truncate max-w-md">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Tier badge — right side on desktop */}
            {userRole === 'commander' && (
              <div className="hidden sm:flex flex-col items-end shrink-0">
                 <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2 mr-1">Highest Agent Rank</span>
                <TierBadge elo={highestElo} hasPlayed={totalMatchSum > 0} prominent />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ STATS ROW ══════════════════════════════════════════════════════ */}
      <div
        className="grid grid-cols-3 rounded-xl overflow-hidden"
        style={{ border: '1px solid #222226' }}
      >
        {[
          { icon: <Swords className="w-3.5 h-3.5 text-primary" />, value: activeAgents, label: 'Lanys', valueColor: '#fff' },
          { icon: <Trophy className="w-3.5 h-3.5" style={{ color: accent }} />, value: rankTier.name, label: 'Highest Agent Rank', valueColor: accent },
          { icon: <Trophy className="w-3.5 h-3.5 text-emerald-400" />, value: `${(profile.winRate ?? 0).toFixed(0)}%`, label: 'Avg Win Rate', valueColor: '#34d399' },
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
              style={{ color: stat.valueColor }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ══ PASSPORT + LANYS ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">

        {/* ── ID CARD ── */}
        <div
          className="sm:col-span-8 rounded-2xl overflow-hidden relative"
          style={{ background: '#0f0f11', border: '1px solid #222226' }}
        >
          {/* Top accent line */}
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}00 0%, ${accent} 40%, ${accent}00 100%)` }} />
          
          {/* Glow blob */}
          {userRole === 'commander' && (
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: accent, opacity: 0.05, filter: 'blur(50px)', transform: 'translate(20%, -20%)' }}
            />
          )}

          <div className="relative z-10 p-4 sm:p-5 h-full flex flex-col">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: userRole === 'commander' ? `${accent}15` : '#1a1a1d', border: userRole === 'commander' ? `1px solid ${accent}30` : '1px solid #2a2a2e' }}
                >
                  <Shield className="w-4 h-4" style={{ color: userRole === 'commander' ? accent : '#a1a1aa' }} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-widest leading-none">Player Dossier</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
                style={{ background: userRole === 'commander' ? `${accent}15` : '#1a1a1d', border: userRole === 'commander' ? `1px solid ${accent}30` : '1px solid #2a2a2e' }}
              >
                <BadgeCheck className="w-3.5 h-3.5" style={{ color: userRole === 'commander' ? accent : '#a1a1aa' }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: userRole === 'commander' ? accent : '#a1a1aa' }}>Active</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex gap-4">
              {/* Photo column */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ width: 64, height: 76, border: userRole === 'commander' ? `2px solid ${accent}40` : '2px solid #2a2a2e' }}
                >
                  <img
                    src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.publicUsername}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                {userRole === 'commander' && (
                  <div
                    className="w-full text-center px-1 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider font-bold"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}25`, color: accent }}
                  >
                    {rankTier.icon} {rankTier.name}
                  </div>
                )}
              </div>

              {/* Fields grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 min-w-0">
                {[
                  { label: 'Role', value: userRole, color: '#ffffff', bold: true },
                  { label: 'Highest Agent Rank', value: userRole === 'commander' ? rankTier.name : '—', color: accent },
                  { label: 'Total Lanys', value: activeAgents, color: '#ffffff' },
                ].map((f) => (
                  <div key={f.label}>
                    <span className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">{f.label}</span>
                    <span
                      className="text-lg font-black italic truncate block leading-tight uppercase"
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
              className="mt-auto pt-4 flex items-center justify-between"
              style={{ borderTop: '0px solid #222226' }}
            >
              <div className="w-full h-px" style={{ background: `linear-gradient(90deg, #222226 0%, #222226 100%)` }} />
            </div>
            <div className="pt-2.5 flex items-center justify-between">
              <span className="font-mono text-[8px] text-zinc-700 uppercase tracking-[0.25em] truncate max-w-[70%]">
                /profile/{profile.publicUsername}
              </span>
              <span className="font-mono text-[8px] text-zinc-700 uppercase tracking-widest shrink-0">LANISTA · ARENA</span>
            </div>
          </div>
        </div>

        {/* ── LANYS LIST ── */}
        <div
          className="sm:col-span-4 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden"
          style={{ background: '#0f0f11', border: '1px solid #222226' }}
        >
          {/* Glow */}
           {userRole === 'commander' && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: accent, opacity: 0.07, filter: 'blur(40px)' }}
            />
          )}

          <div className="relative z-10 flex items-center gap-2">
            <Swords className="w-4 h-4 shrink-0" style={{ color: userRole === 'commander' ? accent : '#a1a1aa' }} />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Lanys</span>
            <span className="ml-auto text-xs font-mono text-zinc-600">{activeAgents} TOTAL</span>
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[160px]">
            {agents.map((agent: any) => (
              <Link key={agent.id} to={`/agent/${agent.id}`} className="group shrink-0 block">
                <div 
                  className="rounded-xl p-2.5 transition-all flex items-center gap-3 shrink-0"
                  style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                >
                  <img
                    src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                    alt={agent.name}
                    className="w-10 h-10 rounded-lg shrink-0 group-hover:scale-105 transition-transform object-cover"
                    style={{ border: '1px solid #333339' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-white italic uppercase group-hover:text-primary transition-colors truncate">{agent.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[8px] text-zinc-400">{agent.elo ?? 1200} ELO</span>
                      <span className="font-mono text-[8px] text-zinc-500">{agent.total_matches ?? (agent.wins || 0) + (agent.losses || 0)} M</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {agents.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No active Lanys</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
