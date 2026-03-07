import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Activity, Trophy, Swords, Zap, Copy, Check, Globe, Shield, Sparkles, LogOut, Layout, Settings, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../lib/api';
import { toast } from 'react-hot-toast';
import { getEloTier, ELO_TIERS } from '../lib/elo';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Reveal } from '../components/common/Reveal';
import { EditProfileModal } from '../components/profile/EditProfileModal';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
);

export default function UserProfile() {
  const [session, setSession] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Binding states
  const [bindAgentIdentifier, setBindAgentIdentifier] = useState('');
  const [bindApiKey, setBindApiKey] = useState('');
  const [bindCode, setBindCode] = useState<string | null>(null);
  const [bindTweetUrl, setBindTweetUrl] = useState('');
  const [bindTwitterHandle, setBindTwitterHandle] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);
  const [uuidCopied, setUuidCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const navigate = useNavigate();
  const { balance: sparkBalance, loading: sparkLoading } = useSparkBalance(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/');
      } else {
        setSession(session);
        fetchProfileData(session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
        return;
      }
      setSession(session);
      fetchProfileData(session.access_token);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchProfileData = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile);

        if (!data.profile?.onboardingCompleted) {
          navigate('/onboarding');
        } else if (searchParams.get('newAuth') === 'true') {
          if (data.profile.activeAgents === 0) {
            toast.success("Welcome Commander! Don't forget to claim your Lany to enter the arena.", { duration: 8000, icon: '🏆' });
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
  }, [navigate, searchParams, setSearchParams]);

  const handleGenerateBindCode = async () => {
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
            <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Lany ID</label>
            <input 
              type="text" 
              placeholder="Enter Lany identifier" 
              className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-xs focus:border-primary/50 outline-none placeholder:text-zinc-600 transition-colors"
              value={bindAgentIdentifier}
              onChange={(e) => setBindAgentIdentifier(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest">API Key</label>
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
            <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Bind Code</label>
            <div className="flex gap-2">
              <span className="flex-1 min-w-0 font-mono text-xs text-zinc-400 p-3 bg-black/40 rounded-lg border border-white/5 select-all truncate">{bindCode}</span>
              <button onClick={() => { navigator.clipboard.writeText(bindCode!); toast.success('Copied!'); }} className="p-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 hover:border-white/20 shrink-0 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=Establishing%20Neural%20Handshake%20with%20@LanistaAI!%20%0A%0ASystem%20Identifier:%20${bindCode}`, '_blank')}
            className="w-full py-3 bg-white text-black text-xs font-black rounded-lg uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          >
            Post on X
          </button>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest">@handle</label>
                <input 
                  type="text" 
                  placeholder="@username" 
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-xs focus:border-green-500/50 outline-none placeholder:text-zinc-600"
                  value={bindTwitterHandle}
                  onChange={(e) => setBindTwitterHandle(e.target.value)}
                />
              </div>
              <div className="flex-[2] min-w-0 space-y-1.5">
                <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Tweet URL</label>
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
            {bindLoading ? 'Syncing...' : 'Verify'}
          </button>
        </motion.div>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="w-12 h-12 border border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <span className="font-mono text-sm uppercase tracking-widest text-zinc-500">Decrypting Profile...</span>
    </div>
  );
  
  if (!session) return null;

  const user = session.user;
  const agents = profileData?.agents || [];
  const activeAgents = agents.length;
  const arenaPoints = profileData?.arenaPoints ?? 0;
  const totalMatchSum = profileData?.totalMatches ?? 0;
  const apiWinRate = profileData?.winRate ?? 0;
  const apiRank = profileData?.rank;

  let highestElo = 0;
  agents.forEach((agent: any) => {
    const elo = agent.elo ?? 1200;
    if (elo > highestElo) highestElo = elo;
  });

  const averageWinRate = totalMatchSum > 0 ? apiWinRate : (activeAgents > 0
    ? agents.reduce((acc: number, a: any) => {
        const m = a.total_matches ?? (a.wins || 0) + (a.losses || 0);
        return acc + (m > 0 ? ((a.wins || 0) / m) * 100 : 0);
      }, 0) / activeAgents
    : 0);
  const rankTier = apiRank
    ? (ELO_TIERS.find(t => t.name === apiRank) ?? getEloTier(highestElo, totalMatchSum > 0))
    : getEloTier(highestElo, totalMatchSum > 0);

  return (
    <div className="pb-24 space-y-10 max-w-6xl mx-auto px-4 sm:px-6 relative pt-0">
      <Reveal>
        <PageHeader
          title={profileData?.role === 'observer' ? 'OBSERVER PROFILE' : 'COMMANDER PROFILE'}
          titleSize="sm"
          badge={
            <div className={`px-4 py-1.5 border rounded-full font-mono text-xs tracking-[0.3em] font-black uppercase ${profileData?.role === 'commander' ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}>
              {profileData?.role || 'Observer'}
            </div>
          }
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-zinc-400 font-black rounded-lg hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-xs uppercase tracking-widest flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" /> Edit Profile
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
                className="px-6 py-2.5 bg-primary/10 border border-primary/20 text-primary/60 font-black rounded-lg hover:bg-primary hover:text-white transition-all text-xs uppercase tracking-widest flex items-center gap-2"
              >
                <LogOut className="w-3 h-3" /> Terminate Session
              </button>
            </div>
          }
        />
      </Reveal>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 [&>*]:min-w-0">
        {[
          { label: 'Rank', value: rankTier.name, icon: Trophy, color: rankTier.color, sub: activeAgents > 0 ? `ELO ${highestElo}` : '—' },
          { label: 'Lanys', value: activeAgents, icon: Swords, color: 'text-primary', sub: 'active' },
          { label: 'Win Rate', value: `${averageWinRate.toFixed(0)}%`, icon: Activity, color: 'text-green-500', sub: `${totalMatchSum} matches` },
          { label: 'Credits', value: arenaPoints.toLocaleString(), icon: Zap, color: 'text-cyan-500', sub: '' },
          { label: 'Spark', value: sparkLoading ? '…' : sparkBalance.toLocaleString(), icon: Sparkles, color: 'text-amber-400', sub: '' }
        ].map((stat, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <div className="h-full min-h-[96px] bg-zinc-900/40 border border-white/5 rounded-xl p-5 backdrop-blur-xl group hover:border-white/10 transition-all flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-xs uppercase tracking-widest mb-1.5">
                <stat.icon size={12} className={stat.color} /> {stat.label}
              </div>
              <div className={`text-xl font-black italic uppercase tracking-tighter ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-0.5">{stat.sub}</div>}
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_minmax(400px,1fr)_minmax(0,280px)] gap-4 lg:gap-6 items-start lg:items-stretch lg:min-h-[320px]">
        {/* LINK LANY - Left on desktop */}
        <Reveal direction="left" delay={0.2} className="min-h-0 order-1 lg:order-1">
          <div className="h-full flex flex-col glass bg-zinc-900/60 border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="mb-4 shrink-0">
               <h3 className="text-base font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                  <XIcon className="w-4 h-4 fill-primary shrink-0" /> Link Lany
               </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
               {renderClaimForm()}
            </div>
          </div>
        </Reveal>

        {/* DOSSIER - Center (dominant) */}
        <Reveal direction="up" delay={0.25} className="min-h-0 order-2 lg:order-2 flex justify-center w-full min-w-0">
          <div className="w-full max-w-[520px] mx-auto lg:mx-0 h-full min-h-[320px] bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-3xl flex flex-col shadow-xl shadow-black/20">
            {profileData?.bannerUrl && (
              <div className="w-full h-32 lg:h-36 bg-zinc-800 shrink-0">
                <img src={profileData.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
              </div>
            )}
               <div className="flex flex-col flex-1 min-h-0 p-5 lg:p-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        profileData?.avatarUrl ||
                        user.user_metadata?.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
                      }
                      alt="Avatar"
                      className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl border border-white/10 bg-black p-0.5 shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl lg:text-2xl font-black text-white italic uppercase tracking-tighter truncate">{profileData?.callsign || 'COMMANDER'}</h3>
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 mt-4 border-t border-white/5 flex-1">
                    <div className="flex items-center gap-2">
                       <Globe size={13} className="text-primary shrink-0" />
                       <span className="font-mono text-xs text-zinc-400 uppercase truncate">{profileData?.sector || 'Unknown'}</span>
                    </div>
                    {profileData?.bio && (
                      <p className="font-mono text-xs text-zinc-500 leading-relaxed line-clamp-2">{profileData.bio}</p>
                    )}
                    {(profileData?.xUrl || profileData?.discordUrl || profileData?.websiteUrl) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {profileData.xUrl && (
                          <a href={profileData.xUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <XIcon className="w-3 h-3 fill-primary" /> X
                          </a>
                        )}
                        {profileData.discordUrl && (
                          <a href={profileData.discordUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                            Discord
                          </a>
                        )}
                        {profileData.websiteUrl && (
                          <a href={profileData.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                            <ExternalLink size={9} /> Website
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {profileData?.publicUsername && (
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="flex-1 font-mono text-[10px] text-zinc-500 truncate">
                        /profile/{profileData.publicUsername}
                      </span>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/profile/${profileData.publicUsername}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Profile URL copied!');
                        }}
                        className="p-2 rounded-lg border border-white/10 bg-white/5 text-zinc-500 hover:text-white shrink-0"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  )}

                  <div className="pt-2 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="flex-1 font-mono text-[10px] text-zinc-600 p-2.5 bg-black/40 rounded-lg border border-white/5 truncate">{user.id}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(user.id);
                          setUuidCopied(true);
                          setTimeout(() => setUuidCopied(false), 2000);
                        }}
                        className={`p-2 rounded-lg border transition-all shrink-0 ${uuidCopied ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}
                      >
                        {uuidCopied ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
               </div>
            </div>
        </Reveal>

        {/* MY LANYS - Right on desktop */}
        <Reveal direction="right" delay={0.3} className="min-h-0 order-3 lg:order-3">
          <div className="h-full flex flex-col bg-zinc-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
               <h3 className="text-base font-black italic text-white uppercase tracking-tighter flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-primary" /> My Lanys
               </h3>
               {activeAgents > 0 && <span className="font-mono text-xs text-zinc-500 uppercase">{activeAgents} active</span>}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 gap-2 overflow-auto">
                  {activeAgents > 0 ? (
                    agents.map((agent: any, idx: number) => (
                      <Link key={idx} to={`/agent/${agent.id}`} className="group shrink-0">
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 hover:border-primary/40 transition-all flex items-center gap-3">
                           <img src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} className="w-10 h-10 rounded-lg border border-white/10 shrink-0 group-hover:scale-105 transition-transform" />
                           <div className="flex-1 min-w-0">
                              <h4 className="text-base font-black text-white italic uppercase group-hover:text-primary transition-colors truncate">{agent.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="font-mono text-[10px] text-zinc-400">{agent.elo ?? 1200} ELO</span>
                                 <span className="font-mono text-[10px] text-zinc-500">{agent.total_matches ?? (agent.wins || 0) + (agent.losses || 0)} m</span>
                              </div>
                           </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="border border-dashed border-white/5 rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-2 min-h-[100px]">
                       <Shield className="w-6 h-6 text-zinc-700" />
                       <p className="font-mono text-xs text-zinc-600 uppercase tracking-wider">Link a Lany to get started</p>
                    </div>
                  )}
                </div>
          </div>
        </Reveal>
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
