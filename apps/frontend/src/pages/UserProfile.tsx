import { Shield, Settings, Copy, Swords, Share2, Sparkles, ExternalLink, Layout, Trophy } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { API_URL } from '../lib/api';
import { getEloTier, ELO_TIERS } from '../lib/elo';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { useAuthStore } from '../lib/auth-store';
import { Link } from 'react-router-dom';
import { TierBadge } from '../components/EloTier';
import { EditProfileModal } from '../components/profile/EditProfileModal';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
);

export default function UserProfile() {
  const session = useAuthStore((s) => s.session);
  const isReady = useAuthStore((s) => s.isReady);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Binding states
  const [bindAgentIdentifier, setBindAgentIdentifier] = useState('');
  const [bindApiKey, setBindApiKey] = useState('');
  const [bindCode, setBindCode] = useState<string | null>(null);
  const [bindTweetUrl, setBindTweetUrl] = useState('');
  const [bindTwitterHandle, setBindTwitterHandle] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchProfileData = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();

        if (!data.profile?.onboardingCompleted) {
          await fetch(`${API_URL}/user/profile/auto-setup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const refetch = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const refreshed = await refetch.json();
          setProfileData(refreshed.profile);
        } else {
          setProfileData(data.profile);
        }

        if (searchParams.get('newAuth') === 'true') {
          if ((data.profile?.activeAgents ?? 0) === 0) {
            toast.success("Welcome Player! Don't forget to claim your Lany to enter the arena.", { duration: 8000, icon: '🏆' });
          }
          searchParams.delete('newAuth');
          setSearchParams(searchParams, { replace: true });
        }
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, [searchParams, setSearchParams]);

  const { balance: sparkBalance, loading: sparkLoading } = useSparkBalance();

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      navigate('/');
      return;
    }
    fetchProfileData(session.access_token);
  }, [isReady, session, navigate, fetchProfileData]);

  const handleGenerateBindCode = async () => {
    if (!session) return;
    if (!bindAgentIdentifier.trim() || !bindApiKey.trim()) {
      setBindError("Lany identifier and API Key are required.");
      return;
    }
    setBindLoading(true);
    setBindError(null);
    try {
      const res = await fetch(`${API_URL}/user/bind/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          bot_identifier: bindAgentIdentifier.trim(),
          api_key: bindApiKey.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate code');
      setBindCode(data.bind_code);
    } catch (err: any) {
      setBindError(err.message);
    } finally {
      setBindLoading(false);
    }
  };

  const handleVerifyBindCode = async () => {
    if (!session) return;
    if (!bindTwitterHandle.trim() || !bindTweetUrl.trim()) {
      setBindError("Please enter your X handle and the post URL.");
      return;
    }
    setBindLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/bind/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          tweet_url: bindTweetUrl.trim(),
          twitter_handle: bindTwitterHandle.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setBindSuccess(data.message);
      setBindError(null);
      setBindCode(null);
      fetchProfileData(session.access_token);
    } catch (err: any) {
      setBindError(err.message);
    } finally {
      setBindLoading(false);
    }
  };

  const renderClaimForm = () => (
    <div className="space-y-4">
      {(bindError || bindSuccess) && (
        <div className={`p-3 border rounded-lg font-mono text-xs uppercase ${
          bindError ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary/10 border-secondary/20 text-secondary'
        }`}>
          {bindError || bindSuccess}
        </div>
      )}
      
      {!bindCode && !bindSuccess && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block font-mono text-xs sm:text-sm text-zinc-500 uppercase tracking-widest">Lany ID</label>
            <input 
              type="text" 
              placeholder="Enter Lany identifier" 
              className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-xs focus:border-primary/50 outline-none placeholder:text-zinc-600 transition-colors"
              value={bindAgentIdentifier}
              onChange={(e) => setBindAgentIdentifier(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-xs sm:text-sm text-zinc-500 uppercase tracking-widest">API Key</label>
            <input 
              type="password" 
              placeholder="Enter API key" 
              className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-xs focus:border-primary/50 outline-none placeholder:text-zinc-600 transition-colors"
              value={bindApiKey}
              onChange={(e) => setBindApiKey(e.target.value)}
            />
          </div>
          <button 
            onClick={handleGenerateBindCode}
            disabled={bindLoading}
            className="w-full py-3 bg-primary text-white rounded-lg font-black uppercase text-xs tracking-wider hover:bg-primary/90 disabled:opacity-30 active:scale-[0.98] transition-all"
          >
            {bindLoading ? '...' : 'Generate'}
          </button>
        </div>
      )}

      {bindCode && !bindSuccess && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block font-mono text-xs sm:text-sm text-zinc-500 uppercase tracking-widest">Bind Code</label>
            <div className="flex gap-2">
              <span className="flex-1 min-w-0 font-mono text-xs text-zinc-400 p-3 bg-black/40 rounded-lg border border-white/5 select-all truncate">{bindCode}</span>
              <button onClick={() => { navigator.clipboard.writeText(bindCode!); toast.success('Copied!'); }} className="p-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 hover:border-white/20 shrink-0 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=Connecting%20with%20@LanistaAI!%20%0A%0ACode:%20${bindCode}`, '_blank')}
            className="w-full py-3 bg-white text-black text-xs font-black rounded-lg uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          >
            Post on X
          </button>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="block font-mono text-xs sm:text-sm text-zinc-500 uppercase tracking-widest">@handle</label>
                <input 
                  type="text" 
                  placeholder="@username" 
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-xs focus:border-green-500/50 outline-none placeholder:text-zinc-600"
                  value={bindTwitterHandle}
                  onChange={(e) => setBindTwitterHandle(e.target.value)}
                />
              </div>
              <div className="flex-[2] min-w-0 space-y-1.5">
                <label className="block font-mono text-xs sm:text-sm text-zinc-500 uppercase tracking-widest">Tweet URL</label>
                <input 
                  type="url" 
                  placeholder="https://x.com/..." 
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-xs focus:border-green-500/50 outline-none placeholder:text-zinc-600"
                  value={bindTweetUrl}
                  onChange={(e) => setBindTweetUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button 
            onClick={handleVerifyBindCode}
            disabled={bindLoading}
            className="w-full py-3 bg-secondary text-white rounded-lg font-black uppercase text-xs tracking-wider hover:bg-secondary/90 disabled:opacity-30 transition-colors"
          >
            {bindLoading ? 'Updating...' : 'Verify'}
          </button>
        </motion.div>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mb-6" />
      <span className="font-mono text-xl sm:text-2xl uppercase tracking-[0.2em] text-zinc-400 font-bold">Decrypting Profile...</span>
    </div>
  );
  
  if (!session) return null;

  const user = session.user;
  const agents = profileData?.agents || [];
  const activeAgents = agents.length;
  // const arenaPoints = profileData?.arenaPoints ?? 0;
  const totalMatchSum = profileData?.totalMatches ?? 0;
  // const apiWinRate = profileData?.winRate ?? 0;
  const apiRank = profileData?.rank;

  let highestElo = 0;
  agents.forEach((agent: any) => {
    const elo = agent.elo ?? 1200;
    if (elo > highestElo) highestElo = elo;
  });

  // const averageWinRate = totalMatchSum > 0 ? apiWinRate : (activeAgents > 0
  //   ? agents.reduce((acc: number, a: any) => {
  //       const m = a.total_matches ?? (a.wins || 0) + (a.losses || 0);
  //       return acc + (m > 0 ? ((a.wins || 0) / m) * 100 : 0);
  //     }, 0) / activeAgents
  //   : 0);
  const rankTier = apiRank
    ? (ELO_TIERS.find(t => t.name === apiRank) ?? getEloTier(highestElo, totalMatchSum > 0))
    : getEloTier(highestElo, totalMatchSum > 0);

  const userRole = activeAgents > 0 ? 'commander' : 'observer';

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
          <div className="shrink-0 relative self-start sm:self-auto group cursor-pointer" onClick={() => setShowEditModal(true)}>
            {userRole === 'commander' && (
              <div
                className="absolute -inset-1 rounded-2xl pointer-events-none"
                style={{ background: accent, opacity: 0.15, filter: 'blur(10px)' }}
              />
            )}
            <div className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-900/50" style={{ border: userRole === 'commander' ? `2px solid ${accent}40` : '2px solid #2a2a2e' }}>
              <img
                src={profileData?.avatarUrl || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt="Avatar"
                className="w-full h-full object-contain group-hover:brightness-110 transition-all"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Settings className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between items-start gap-4">
            {/* Info */}
            <div className="space-y-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight leading-none">
                  {profileData?.callsign || 'PLAYER'}
                </h1>
              </div>

              {/* Pill tags */}
              <div className="flex flex-wrap items-center gap-1.5">
                {profileData?.xUrl && (
                  <a
                    href={profileData.xUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:border-zinc-500 transition-colors"
                    style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                  >
                    <XIcon className="w-3 h-3 fill-zinc-400" />
                    <span className="font-mono text-[11px] text-zinc-400 tracking-wider">X.COM</span>
                  </a>
                )}
                {profileData?.discordUrl && (
                  <a
                    href={profileData.discordUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:border-indigo-500/50 transition-colors"
                    style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                  >
                    <span className="font-mono text-[11px] text-zinc-400 tracking-wider">DISCORD</span>
                  </a>
                )}
                {profileData?.websiteUrl && (
                  <a
                    href={profileData.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:border-cyan-500/50 transition-colors"
                    style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
                  >
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                    <span className="font-mono text-[11px] text-zinc-400 tracking-wider">WEBSITE</span>
                  </a>
                )}
              </div>
              {profileData?.bio && (
                  <p className="text-zinc-400 text-sm italic mt-2 truncate max-w-md">
                    {profileData.bio}
                  </p>
                )}
            </div>

            {/* Right Side: Edit & Tier */}
            <div className="flex flex-col items-start sm:items-end shrink-0 gap-3">
              <button
                 onClick={() => setShowEditModal(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:border-zinc-500 hover:bg-white/5 transition-colors"
                 style={{ background: 'transparent', border: '1px dashed #2a2a2e' }}
                 title="Edit Profile"
              >
                 <Settings className="w-3.5 h-3.5 text-zinc-500" />
                 <span className="font-mono text-xs text-zinc-500 tracking-wider">EDIT PROFILE</span>
              </button>
              
              {userRole === 'commander' && (
                <div className="flex flex-col items-start sm:items-end shrink-0">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2 mr-1">Highest Agent Rank</span>
                  <TierBadge elo={highestElo} hasPlayed={totalMatchSum > 0} prominent />
                </div>
              )}
            </div>
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
          { icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />, value: sparkLoading ? '…' : sparkBalance.toLocaleString(), label: 'Spark', valueColor: '#fbbf24' },
          { icon: <Trophy className="w-3.5 h-3.5" style={{ color: accent }} />, value: rankTier.name, label: 'Highest Agent Rank', valueColor: accent },
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

      {/* ══ BOTTOM GRIDS ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">

        {/* ── LINK LANY (LEFT) ── */}
        <div
          className="sm:col-span-4 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden"
          style={{ background: '#0f0f11', border: '1px solid #222226' }}
        >
          <div className="relative z-10 flex items-center gap-2 shrink-0">
            <Layout className="w-4 h-4 shrink-0" style={{ color: accent }} />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Link Lany</span>
          </div>
          <div className="relative z-10 flex-1 overflow-y-auto pr-1">
            {renderClaimForm()}
          </div>
        </div>

        {/* ── PROFILE LINK (CENTER) ── */}
        <div
          className="sm:col-span-4 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden"
          style={{ background: '#0f0f11', border: '1px solid #222226' }}
        >
          <div className="relative z-10 flex items-center gap-2 shrink-0">
            <Share2 className="w-4 h-4 shrink-0 text-primary" />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Profile Link</span>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center">
            {profileData?.publicUsername ? (
              <div className="space-y-3">
                <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Public Profile URL
                </span>
                <a
                  href={`/profile/${profileData.publicUsername}`}
                  className="block w-full rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 shadow-inner hover:border-primary hover:bg-primary/10 transition-colors"
                >
                  <span className="block text-[11px] font-mono text-zinc-400 uppercase tracking-[0.18em] mb-1">
                    lanista.ai / profile
                  </span>
                  <span className="block text-lg sm:text-xl font-black text-primary truncate">
                    {profileData.publicUsername}
                  </span>
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/profile/${profileData.publicUsername}`;
                      window.open(`https://x.com/intent/tweet?text=Check%20out%20my%20Lanista%20profile!&url=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[11px] font-mono uppercase tracking-widest text-zinc-300 hover:bg-[#1DA1F2]/15 hover:border-[#1DA1F2]/50 hover:text-[#1DA1F2] transition-all group"
                    title="Share on X"
                  >
                    <Share2 size={12} className="group-hover:hidden" />
                    <XIcon className="w-3 h-3 hidden group-hover:block fill-[#1DA1F2] text-[#1DA1F2]" />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/profile/${profileData.publicUsername}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Profile URL copied!');
                    }}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[11px] font-mono uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
                    title="Copy profile link"
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest leading-relaxed">
                Set a <span className="text-primary">public username</span> in your profile settings to unlock a shareable arena dossier.
              </div>
            )}
          </div>
        </div>

        {/* ── LANYS LIST (RIGHT) ── */}
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

          <div className="relative z-10 flex items-center gap-2 shrink-0">
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
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center border border-dashed border-white/5 rounded-xl">
                 <Shield className="w-5 h-5 text-zinc-700 mb-2" />
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Link a Lany to get started</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {showEditModal && session && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          session={session}
          profileData={profileData}
          onSuccess={() => fetchProfileData(session.access_token)}
        />
      )}
    </div>
  );
}
