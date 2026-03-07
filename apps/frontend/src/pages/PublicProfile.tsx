import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, Trophy, Swords, Globe, ExternalLink } from 'lucide-react';
import { API_URL } from '../lib/api';
import { PageHeader } from '../components/common/PageHeader';
import { Reveal } from '../components/common/Reveal';

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
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <div className="w-12 h-12 border border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Loading...</span>
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

  return (
    <div className="pb-24 space-y-10 max-w-6xl mx-auto px-4 sm:px-6 relative pt-0">
      <Reveal>
        <PageHeader title={profile.callsign || 'COMMANDER'} titleSize="sm" />
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Rank', value: profile.rank || 'IRON', icon: Trophy, color: 'text-primary', sub: '' },
          { label: 'Lanys', value: profile.activeAgents ?? 0, icon: Swords, color: 'text-primary', sub: 'active' },
          { label: 'Win Rate', value: `${(profile.winRate ?? 0).toFixed(0)}%`, icon: Activity, color: 'text-green-500', sub: `${profile.totalMatches ?? 0} matches` },
        ].map((stat, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 backdrop-blur-xl min-h-[88px]">
              <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-widest mb-1.5">
                <stat.icon size={10} className={stat.color} /> {stat.label}
              </div>
              <div className={`text-lg font-black italic uppercase tracking-tighter ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest mt-0.5">{stat.sub}</div>}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal direction="left" delay={0.2}>
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-3xl relative">
          {profile.bannerUrl && (
            <div className="h-32 bg-zinc-800">
              <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.publicUsername}`}
                alt="Avatar"
                className="w-16 h-16 rounded-xl border border-white/10 bg-black object-cover shrink-0"
              />
              <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{profile.callsign || 'COMMANDER'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Globe size={11} className="text-primary shrink-0" />
                  <span className="font-mono text-[9px] text-zinc-400 uppercase">{profile.sector || 'Unknown'}</span>
                </div>
                {(profile.xUrl || profile.discordUrl || profile.websiteUrl) && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {profile.xUrl && (
                      <a href={profile.xUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-1">
                        <XIcon className="w-3 h-3 fill-primary" /> X
                      </a>
                    )}
                    {profile.discordUrl && (
                      <a href={profile.discordUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 hover:underline">
                        Discord
                      </a>
                    )}
                    {profile.websiteUrl && (
                      <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-cyan-400 hover:underline flex items-center gap-1">
                        <ExternalLink size={9} /> Website
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            {profile.bio && (
              <p className="font-mono text-[10px] text-zinc-500 leading-relaxed mt-4 pt-4 border-t border-white/5">{profile.bio}</p>
            )}
          </div>
        </div>
      </Reveal>

      {agents.length > 0 && (
        <Reveal direction="up" delay={0.3}>
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl">
            <h3 className="text-sm font-black italic text-white uppercase tracking-tighter mb-4">Lanys</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent: any) => (
                <Link key={agent.id} to={`/agent/${agent.id}`} className="group">
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 hover:border-primary/40 transition-all flex items-center gap-3">
                    <img
                      src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                      alt={agent.name}
                      className="w-10 h-10 rounded-lg border border-white/10 shrink-0 group-hover:scale-105 transition-transform object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-white italic uppercase group-hover:text-primary transition-colors truncate">{agent.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[8px] text-zinc-400">{agent.elo ?? 1200} ELO</span>
                        <span className="font-mono text-[8px] text-zinc-500">{agent.total_matches ?? (agent.wins || 0) + (agent.losses || 0)} m</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
