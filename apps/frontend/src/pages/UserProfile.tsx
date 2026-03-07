import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Activity, Trophy, Swords, Zap, Copy, Check, X, Globe, Terminal, Shield, Eye, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../lib/api';
import { toast } from 'react-hot-toast';
import { getEloTier } from '../lib/elo';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { Link } from 'react-router-dom';

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
  const [showClaimModal, setShowClaimModal] = useState(false);

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

  const fetchProfileData = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile);

        // If onboarding is not completed, redirect to onboarding page
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
  };

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
      setBindError(null); // Explicitly clear error state on success
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
        <div className={`p-3 border rounded-lg font-mono text-xs animate-in fade-in slide-in-from-top-1 ${
          bindError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
        }`}>
          {bindError || bindSuccess}
        </div>
      )}
      
      {!bindCode && !bindSuccess && (
        <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
          <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold">Step 1: Locate Lany</div>
          <div className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="Lany name or Core ID" 
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-primary/50 outline-none"
              value={bindAgentIdentifier}
              onChange={(e) => setBindAgentIdentifier(e.target.value)}
            />
            <div className="flex gap-3">
              <input 
                type="password" 
                placeholder="API Key" 
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-primary/50 outline-none"
                value={bindApiKey}
                onChange={(e) => setBindApiKey(e.target.value)}
              />
              <button 
                onClick={handleGenerateBindCode}
                disabled={bindLoading}
                className="px-6 bg-primary text-white rounded-lg font-black uppercase text-[10px] hover:bg-primary/90 disabled:opacity-30"
              >
                {bindLoading ? '...' : 'Get Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bindCode && !bindSuccess && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold">Step 2: Post Code</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono text-sm tracking-widest truncate">{bindCode}</div>
              <button onClick={() => { navigator.clipboard.writeText(bindCode!); toast.success('Copied!'); }} className="p-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=Verifying%20my%20@LanistaAI%20agent!%20%0A%0ACode:%20${bindCode}`, '_blank')}
              className="w-full py-3 bg-white text-black text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-zinc-200 transition-all"
            >
              Post to X
            </button>
          </div>

          <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold">Step 3: Verification URL</div>
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="X Handle (e.g. meric)" 
                className="w-1/3 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-green-500/50 outline-none"
                value={bindTwitterHandle}
                onChange={(e) => setBindTwitterHandle(e.target.value)}
              />
              <input 
                type="url" 
                placeholder="Tweet URL" 
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-green-500/50 outline-none"
                value={bindTweetUrl}
                onChange={(e) => setBindTweetUrl(e.target.value)}
              />
              <button 
                onClick={handleVerifyBindCode}
                disabled={bindLoading}
                className="px-6 bg-green-500 text-white rounded-lg font-black uppercase text-[10px] hover:bg-green-600 disabled:opacity-30"
              >
                {bindLoading ? '...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
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
    <div className="py-12 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto px-4 relative">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex items-end gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-colors" />
            <img src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="relative w-24 h-24 rounded-2xl border-2 border-white/10 bg-zinc-900 object-cover" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-4xl font-black text-white italic uppercase tracking-tighter">{profileData?.callsign || 'Commander'}</h1>
              <div className={`px-2 py-0.5 border rounded-md font-mono text-[8px] tracking-widest font-black uppercase ${profileData?.role === 'commander' ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}>
                {profileData?.role || 'Observer'}
              </div>
            </div>
            <div className="flex gap-4 font-mono text-sm text-zinc-400">
              <span className="flex items-center gap-2"><User size={14} /> {user.email}</span>
              {profileData?.sector && <span className="flex items-center gap-2"><Globe size={14} /> {profileData.sector}</span>}
            </div>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} className="px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs uppercase tracking-widest">Sign Out</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Rank', value: rankTier.name, icon: Trophy, color: rankTier.color, sub: activeAgents > 0 ? `ELO ${highestElo}` : 'No active Lany' },
            { label: 'Active Lany', value: activeAgents, icon: Swords, color: 'text-primary', sub: 'Ready for fight' },
            { label: 'Win Rate', value: `${averageWinRate.toFixed(0)}%`, icon: Activity, color: 'text-green-500', sub: `${totalMatchSum} matches` },
            { label: 'Arena Points', value: arenaPoints.toLocaleString(), icon: Zap, color: 'text-cyan-500', sub: 'Available' },
            { label: 'Spark', value: sparkLoading ? '…' : sparkBalance.toLocaleString(), icon: Sparkles, color: 'text-amber-400', sub: 'Watch & spend', href: '/hub' }
          ].map((stat, i) => (
            <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-3"><stat.icon size={16} className={stat.color} /> {stat.label}</div>
              {stat.href ? (
                <Link to={stat.href} className={`text-2xl font-black uppercase tracking-tighter ${stat.color} hover:opacity-80 block`}>{stat.value}</Link>
              ) : (
                <div className={`text-2xl font-black uppercase tracking-tighter ${stat.color}`}>{stat.value}</div>
              )}
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{stat.sub}</div>
            </div>
          ))}
        </div>

        {profileData?.role === 'commander' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-1 md:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2 text-primary"><XIcon className="w-5 h-5 fill-primary" /> Claim Your Lany</h3>
            {renderClaimForm()}
          </motion.div>
        )}

        <div className={profileData?.role === 'commander' ? "col-span-1 space-y-6" : "col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6"}>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden h-full">
             <div className="absolute top-0 right-0 p-4 opacity-5">{profileData?.role === 'commander' ? <Shield size={80} /> : <Eye size={80} />}</div>
             <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-4"><Terminal size={16} className="inline mr-2 text-primary" /> Tactical Dossier</h3>
             <p className="font-mono text-xs text-zinc-400 italic">"{profileData?.bio || 'No philosophy archived yet.'}"</p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm h-full">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-6 border-b border-white/5 pb-4">Account Details</h3>
            <div className="space-y-4 font-mono text-[10px]">
              <div>
                <span className="text-zinc-500 uppercase block mb-1">ID (UUID)</span>
                <div className="flex items-center gap-2">
                  <span className="text-white break-all bg-black/30 p-2 rounded flex-1 border border-white/5">{user.id}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      setUuidCopied(true);
                      setTimeout(() => setUuidCopied(false), 2000);
                    }}
                    className={`p-2 rounded border transition-all ${uuidCopied ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                  >
                    {uuidCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div><span className="text-zinc-500 uppercase block mb-1">Created At</span><span className="text-white">{new Date(user.created_at).toLocaleDateString()}</span></div>
            </div>
          </div>
        </div>

        {activeAgents > 0 && (
          <div className="col-span-1 md:col-span-3 mt-8 space-y-6">
            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3"><span className="w-2 h-2 bg-primary rounded-full" /> Your Gladiators</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent: any) => (
                <div key={agent.id} onClick={() => navigate(`/agent/${agent.id}`)} className="bg-zinc-900/40 border border-white/5 hover:border-primary/50 transition-all rounded-2xl p-6 cursor-pointer group">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} className="w-14 h-14 rounded-full border border-white/10 group-hover:border-primary/50" />
                    <div><h4 className="text-xl font-black text-white italic uppercase group-hover:text-primary transition-colors">{agent.name}</h4><div className="text-[10px] text-zinc-500 font-mono">ELO: {agent.elo || 1200}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {profileData?.role === 'observer' && !showClaimModal && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed bottom-12 right-6 z-[500] w-[280px]"
          >
            <div className="bg-zinc-950/90 border border-primary/30 rounded-3xl p-5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30"><Sparkles size={18} className="text-primary" /></div>
                  <div className="leading-tight"><h4 className="text-white font-black text-xs uppercase tracking-tighter">Upgrade Needed</h4><p className="text-zinc-500 text-[9px] font-mono uppercase">Inactive Tactical Status</p></div>
                </div>
                <p className="text-zinc-400 text-[10px] font-mono leading-relaxed border-l-2 border-primary/20 pl-3">Ready to command? Claim your Lany and enter the arena ranks.</p>
                <button onClick={() => setShowClaimModal(true)} className="w-full py-3 bg-primary text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Claim Lany</button>
              </div>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/20 animate-scan" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClaimModal(false)} className="absolute inset-0 bg-black/90" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden">
               <button onClick={() => setShowClaimModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white"><X size={20} /></button>
               <div className="space-y-6">
                 <div className="space-y-1">
                   <div className="flex items-center gap-2 text-primary italic font-black text-xs uppercase"><XIcon className="w-4 h-4 fill-primary" /> Neural Claim</div>
                   <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Claim Your Lany</h2>
                 </div>
                 {renderClaimForm()}
                 {bindSuccess && <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-black font-black uppercase text-xs rounded-2xl hover:bg-primary hover:text-white transition-all">Complete Transition</button>}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
