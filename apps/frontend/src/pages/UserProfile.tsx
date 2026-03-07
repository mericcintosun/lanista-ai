import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Activity, Trophy, Swords, Zap, Copy, Check, Globe, Terminal, Shield, Sparkles, LogOut, Layout } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../lib/api';
import { toast } from 'react-hot-toast';
import { getEloTier } from '../lib/elo';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Reveal } from '../components/common/Reveal';

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
        <div className={`p-3 border rounded-lg font-mono text-[10px] uppercase tracking-wider ${
          bindError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
        }`}>
          {bindError || bindSuccess}
        </div>
      )}
      
      {!bindCode && !bindSuccess && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="LANY_ID / NAME" 
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-4 text-white font-mono text-[11px] uppercase tracking-[0.2em] focus:border-primary/50 outline-none transition-all placeholder:text-zinc-700"
                value={bindAgentIdentifier}
                onChange={(e) => setBindAgentIdentifier(e.target.value)}
              />
              <div className="absolute top-0 right-0 p-4"><Terminal size={14} className="text-zinc-700" /></div>
            </div>
            
            <div className="flex gap-3">
              <input 
                type="password" 
                placeholder="ACCESS_KEY" 
                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-4 text-white font-mono text-[11px] uppercase tracking-[0.2em] focus:border-primary/50 outline-none transition-all placeholder:text-zinc-700"
                value={bindApiKey}
                onChange={(e) => setBindApiKey(e.target.value)}
              />
              <button 
                onClick={handleGenerateBindCode}
                disabled={bindLoading}
                className="px-6 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,45,45,0.2)]"
              >
                {bindLoading ? '...' : 'Generate Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bindCode && !bindSuccess && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-4 bg-zinc-900/60 rounded-2xl border border-white/5 space-y-4">
             <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">1</span>
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Copy validation identifier:</p>
             </div>
             <div className="flex items-center gap-2">
              <div className="flex-1 bg-black p-4 rounded-xl border border-white/5 text-white font-mono text-xs tracking-widest select-all">{bindCode}</div>
              <button onClick={() => { navigator.clipboard.writeText(bindCode!); toast.success('Copied!'); }} className="p-4 bg-white/5 border border-white/10 rounded-xl text-white hover:border-white/20 transition-all">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/60 rounded-2xl border border-white/5 space-y-4">
             <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">2</span>
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Broadcast record on X:</p>
             </div>
             <button 
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=Establishing%20Neural%20Handshake%20with%20@LanistaAI!%20%0A%0ASystem%20Identifier:%20${bindCode}`, '_blank')}
              className="w-full py-4 bg-white text-black text-[11px] font-black rounded-xl uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
            >
              Post Verification Record
            </button>
          </div>

          <div className="p-4 bg-zinc-900/60 rounded-2xl border border-white/5 space-y-4">
             <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">3</span>
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Submit event link:</p>
             </div>
             <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="X_HANDLE" 
                className="w-1/3 bg-black border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-[11px] uppercase focus:border-green-500/50 outline-none"
                value={bindTwitterHandle}
                onChange={(e) => setBindTwitterHandle(e.target.value)}
              />
              <input 
                type="url" 
                placeholder="EVENT_URL (TWEET)" 
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-[11px] uppercase focus:border-green-500/50 outline-none"
                value={bindTweetUrl}
                onChange={(e) => setBindTweetUrl(e.target.value)}
              />
            </div>
            <button 
                onClick={handleVerifyBindCode}
                disabled={bindLoading}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-green-600 disabled:opacity-30 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
              >
                {bindLoading ? 'Syncing...' : 'Initiate Handshake'}
              </button>
          </div>
        </motion.div>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="w-12 h-12 border border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Decrypting Profile...</span>
    </div>
  );
  
  if (!session) return null;

  const user = session.user;
  const agents = profileData?.agents || [];
  const activeAgents = agents.length;
  const arenaPoints = profileData?.arenaPoints || 0;
  
  let totalMatchSum = 0;
  let totalWinRatePoints = 0;
  let highestElo = 0;

  agents.forEach((agent: any) => {
    const agentMatches = agent.total_matches || 0;
    const agentWins = agent.wins || 0;
    const elo = agent.elo || 1200;
    totalMatchSum += agentMatches;
    totalWinRatePoints += agentMatches > 0 ? (agentWins / agentMatches) * 100 : 0;
    if (elo >= highestElo) { highestElo = elo; }
  });

  const averageWinRate = activeAgents > 0 ? (totalWinRatePoints / activeAgents) : 0;
  const rankTier = getEloTier(highestElo, totalMatchSum > 0);

  return (
    <div className="pb-32 space-y-24 max-w-7xl mx-auto px-6 relative pt-0">
      <Reveal>
        <PageHeader 
          title="COMMANDER PROFILE"
          subtitle="// ARCHIVE_ACCESS: GRANTED"
          badge={
            <div className={`px-4 py-1.5 border rounded-full font-mono text-[10px] tracking-[0.3em] font-black uppercase ${profileData?.role === 'commander' ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}>
              {profileData?.role || 'Observer'}
            </div>
          }
          actions={
            <button 
              onClick={() => supabase.auth.signOut().then(() => navigate('/'))} 
              className="px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500/60 font-black rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <LogOut className="w-3 h-3" /> Terminate Session
            </button>
          }
        />
      </Reveal>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Tactical Rank', value: rankTier.name, icon: Trophy, color: rankTier.color, sub: activeAgents > 0 ? `ELO ${highestElo}` : 'STANDBY' },
          { label: 'Neural Assets', value: activeAgents, icon: Swords, color: 'text-primary', sub: 'ACTIVE LANY' },
          { label: 'Combat Ratio', value: `${averageWinRate.toFixed(0)}%`, icon: Activity, color: 'text-green-500', sub: `${totalMatchSum} ENGAGEMENTS` },
          { label: 'Arena Credits', value: arenaPoints.toLocaleString(), icon: Zap, color: 'text-cyan-500', sub: 'VIRTUAL CURRENCY' },
          { label: 'Spark Engine', value: sparkLoading ? '…' : sparkBalance.toLocaleString(), icon: Sparkles, color: 'text-amber-400', sub: 'LIVE CAPITAL' }
        ].map((stat, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl group hover:border-white/10 transition-all">
              <div className="flex items-center gap-2 text-zinc-500 font-mono text-[9px] uppercase tracking-widest mb-3">
                <stat.icon size={12} className={stat.color} /> {stat.label}
              </div>
              <div className={`text-2xl font-black italic uppercase tracking-tighter ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest">{stat.sub}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: DOSSIER */}
        <div className="lg:col-span-4 space-y-8">
          <Reveal direction="left" delay={0.2}>
            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5"><User size={120} /></div>
               <div className="relative z-10 space-y-8">
                  <div className="space-y-4">
                    <img src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-20 h-20 rounded-3xl border-2 border-white/10 bg-black p-1 shadow-2xl" />
                    <div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">{profileData?.callsign || 'COMMANDER'}</h3>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <div className="space-y-2">
                       <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest block">Neural Sector</span>
                       <div className="flex items-center gap-2 text-white font-mono text-xs uppercase italic"><Globe size={14} className="text-primary" /> {profileData?.sector || 'Unknown Terminal'}</div>
                    </div>
                    <div className="space-y-2">
                       <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest block">Dossier Brief</span>
                       <p className="font-mono text-[10px] text-zinc-400 leading-relaxed uppercase tracking-wider bg-black/40 p-4 rounded-xl border border-white/5">
                        "{profileData?.bio || 'No strategic philosophy documented in headquarters archive.'}"
                       </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest block mb-3">System Access ID</span>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-mono text-[9px] text-zinc-500 p-3 bg-black/40 rounded-xl border border-white/5 truncate">{user.id}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(user.id);
                          setUuidCopied(true);
                          setTimeout(() => setUuidCopied(false), 2000);
                        }}
                        className={`p-3 rounded-xl border transition-all ${uuidCopied ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}
                      >
                        {uuidCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          </Reveal>
        </div>

        {/* RIGHT: CONTROL CENTER */}
        <div className="lg:col-span-8 space-y-8">
           <Reveal direction="right" delay={0.3}>
              <div className="glass bg-zinc-900/60 border border-primary/20 rounded-[2.5rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                         <XIcon className="w-6 h-6 fill-primary" /> Command Handshake
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest max-w-sm">Securely link your Lany to your commander profile via Neural X-Verification.</p>
                   </div>
                   <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                      <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-[0.2em]">Oracle Proxy: Active</span>
                   </div>
                </div>

                <div className="relative z-10 max-w-2xl">
                   {renderClaimForm()}
                </div>
              </div>
           </Reveal>

           {/* ACTIVE ASSETS */}
           <Reveal direction="up" delay={0.4}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                      <Layout className="w-5 h-5 text-primary" /> Deployed Assets
                   </h3>
                   <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">{activeAgents} COMBATANTS FOUND</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeAgents > 0 ? (
                    agents.map((agent: any, idx: number) => (
                      <Link key={idx} to={`/agent/${agent.id}`} className="group h-full">
                        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 hover:border-primary/40 transition-all flex items-center gap-6 backdrop-blur-xl h-full">
                           <div className="relative">
                              <div className="absolute -inset-1 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                              <img src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} className="w-16 h-16 rounded-2xl border border-white/10 relative z-10 group-hover:scale-110 transition-transform" />
                           </div>
                           <div className="flex-1">
                              <h4 className="text-xl font-black text-white italic uppercase group-hover:text-primary transition-colors">{agent.name}</h4>
                              <div className="flex items-center gap-4 mt-2">
                                 <div className="flex items-center gap-2">
                                    <Trophy size={10} className="text-primary" />
                                    <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest">{agent.elo || 1200} ELO</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Activity size={10} className="text-green-500" />
                                    <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest">{agent.total_matches || 0} MATCHES</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-2 border-2 border-dashed border-white/5 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center space-y-4">
                       <Shield className="w-12 h-12 text-zinc-800" />
                       <div className="space-y-1">
                         <p className="font-mono text-xs text-zinc-600 uppercase tracking-[0.2em] font-black italic">No Intel Found</p>
                         <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">Connect a Lany to activate your fleet dossier.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
           </Reveal>
        </div>
      </div>
    </div>
  );
}
