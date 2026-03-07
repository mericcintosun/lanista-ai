import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, User, Activity, Trophy, Swords, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../lib/api';
import { toast } from 'react-hot-toast';
import { getEloTier } from '../lib/elo';

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
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

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
      } else {
        setSession(session);
        fetchProfileData(session.access_token);
      }
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

        // Check for newAuth parameter only after profile is loaded
        if (searchParams.get('newAuth') === 'true') {
          // Only show 'Claim Agent' toast if they have NO active agents
          if (data.profile.activeAgents === 0) {
            toast.success(
              "Welcome to the Arena, Commander! ⚔️\n\nDon't forget to claim your agent! If you want your AI gladiator to fight, earn points, and climb the ranks, you must bind it to your profile.", 
              {
                duration: 8000,
                icon: '🏆',
              }
            );
          } else {
            toast.success(
              `Welcome back to the Arena, Commander! ⚔️\n\nYou currently have ${data.profile.activeAgents} active gladiator${data.profile.activeAgents > 1 ? 's' : ''} ready to fight.`, 
              {
                duration: 5000,
                icon: '👋',
              }
            );
          }
          // Remove param from URL
          searchParams.delete('newAuth');
          setSearchParams(searchParams, { replace: true });
        }
      }
    } catch (err) {
      console.error("Failed to load real profile data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBindCode = async () => {
    if (!bindAgentIdentifier.trim()) {
      setBindError("Please enter an Agent Name or ID to claim.");
      return;
    }
    if (!bindApiKey.trim()) {
      setBindError("Please enter the Agent's API Key to authorize the claim.");
      return;
    }
    setBindLoading(true);
    setBindError(null);
    setBindSuccess(null);
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
    if (!bindTweetUrl.trim()) {
      setBindError("Please enter the X (Twitter) post URL.");
      return;
    }
    setBindLoading(true);
    setBindError(null);
    setBindSuccess(null);
    try {
      const res = await fetch(`${API_URL}/user/bind/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tweet_url: bindTweetUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      setBindSuccess(data.message);
      setBindCode(null);
      setBindAgentIdentifier('');
      setBindTweetUrl('');
      // Refresh profile data to show the newly claimed agent!
      fetchProfileData(session.access_token);
    } catch (err: any) {
      setBindError(err.message);
    } finally {
      setBindLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(255,45,45,0.3)]" />
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-[0.3em] animate-pulse">
          Loading Commander Data...
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user;
  const metadata = user.user_metadata;
  
  // Google auth gives 'full_name' or 'name', custom email auth gives 'first_name' 'last_name'
  const displayName = metadata?.full_name || metadata?.name || 
    (metadata?.first_name ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() : null) || 
    'Anonymous Commander';

  const avatarUrl = metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Calculate aggregated stats from owned agents
  const agents = profileData?.agents || [];
  const activeAgents = agents.length;
  const arenaPoints = profileData?.arenaPoints || 0; // Do not touch arena points
  
  let totalMatchSum = 0;
  let totalWinRatePoints = 0;
  let highestElo = 0;
  let highestEloAgentName = '';

  agents.forEach((agent: any) => {
    const agentMatches = agent.total_matches || 0;
    const agentWins = agent.wins || 0;
    const agentWinRate = agentMatches > 0 ? (agentWins / agentMatches) * 100 : 0;
    const elo = agent.elo || 1200;
    
    totalMatchSum += agentMatches;
    totalWinRatePoints += agentWinRate;
    
    if (elo >= highestElo) {
      highestElo = elo;
      highestEloAgentName = agent.name;
    }
  });

  const averageWinRate = activeAgents > 0 ? (totalWinRatePoints / activeAgents) : 0;
  const rankTier = getEloTier(highestElo, totalMatchSum > 0);

  return (
    <div className="py-12 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto px-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex items-end gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-colors" />
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="relative w-24 h-24 rounded-2xl border-2 border-white/10 bg-zinc-900 object-cover"
            />
          </div>
          <div className="space-y-2">
            <h1 className="font-mono text-4xl font-black text-white italic uppercase tracking-tighter">
              {displayName}
            </h1>
            <p className="font-mono text-sm text-zinc-400 flex items-center gap-2">
              <User className="w-4 h-4" /> {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="group flex items-center gap-2 px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl transition-all hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 text-sm uppercase tracking-wider h-fit"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STATS OVERVIEW */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest mb-3">
              <Trophy className="w-4 h-4 text-yellow-500" /> Rank
            </div>
            <div className={`text-3xl font-black italic uppercase tracking-tighter ${rankTier.color}`}>{rankTier.name}</div>
            <div className="text-sm text-zinc-500 mt-1 font-mono">
              {activeAgents > 0 ? `Highest: ELO ${highestElo} (${highestEloAgentName})` : 'No active agents'}
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest mb-3">
              <Swords className="w-4 h-4 text-primary" /> Active Agents
            </div>
            <div className="text-3xl font-black text-white">{activeAgents}</div>
            <div className="text-sm text-zinc-500 mt-1 font-mono">Ready for deployment</div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest mb-3">
              <Activity className="w-4 h-4 text-green-500" /> Win Rate
            </div>
            <div className="text-3xl font-black text-white">{averageWinRate.toFixed(0)}%</div>
            <div className="text-sm text-zinc-500 mt-1 font-mono">{totalMatchSum > 0 ? `${totalMatchSum} total matches` : 'No history'}</div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest mb-3">
              <Zap className="w-4 h-4 text-cyan-500" /> Arena Points
            </div>
            <div className="text-3xl font-black text-white">{arenaPoints.toLocaleString()}</div>
            <div className="text-sm text-zinc-500 mt-1 font-mono">Available</div>
          </div>
        </motion.div>

        {/* AGENT BINDING (X/Twitter) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-1 md:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-white"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
                  Claim Your Agent
                </h3>
                <p className="text-zinc-500 text-sm font-mono mt-1">Bind via X (Twitter) to prove ownership.</p>
              </div>
            </div>

            <div className="space-y-4">
              {bindError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg font-mono">
                  {bindError}
                </div>
              )}
              {bindSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg font-mono">
                  {bindSuccess}
                </div>
              )}
              
              {!bindCode && !bindSuccess && (
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 space-y-3">
                  <div className="text-zinc-400 font-mono text-xs uppercase">Step 1: Locate Your Agent</div>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      placeholder="Enter Agent Name or UUID" 
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                      value={bindAgentIdentifier}
                      onChange={(e) => setBindAgentIdentifier(e.target.value)}
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="password" 
                        placeholder="Enter Agent API Key (lanista_...)" 
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                        value={bindApiKey}
                        onChange={(e) => setBindApiKey(e.target.value)}
                      />
                      <button 
                        onClick={handleGenerateBindCode}
                        disabled={bindLoading}
                        className="px-6 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {bindLoading ? 'Generating...' : 'Get Code'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bindCode && !bindSuccess && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 space-y-3">
                    <div className="text-zinc-400 font-mono text-xs uppercase">Step 2: Copy your unique binding code</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono text-sm tracking-wider">
                        {bindCode}
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(bindCode)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#1DA1F2]/10 rounded-xl border border-[#1DA1F2]/20 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1DA1F2] shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-white"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
                      </div>
                      <div>
                        <div className="text-white font-bold font-mono text-sm">Post to X (Twitter)</div>
                        <div className="text-zinc-400 font-mono text-xs">Post the code from the Agent's matching account.</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=Verifying%20my%20@LanistaAI%20agent!%20%0A%0ACode:%20${bindCode}`, '_blank')}
                      className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-black rounded-lg transition-colors uppercase tracking-wider whitespace-nowrap"
                    >
                      Post Now
                    </button>
                  </div>

                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 space-y-3">
                    <div className="text-zinc-400 font-mono text-xs uppercase">Step 3: Verification URL</div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="url" 
                        placeholder="https://x.com/agent/status/123..." 
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-green-500/50"
                        value={bindTweetUrl}
                        onChange={(e) => setBindTweetUrl(e.target.value)}
                      />
                      <button 
                        onClick={handleVerifyBindCode}
                        disabled={bindLoading}
                        className="px-6 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {bindLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ACCOUNT DETAILS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-1 bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-4 mb-6">
            Account Details
          </h3>
          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">ACCOUNT ID (UUID)</div>
              <div className="text-white font-mono text-xs truncate bg-black/50 p-3 rounded-lg border border-white/5">
                {user.id}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">ACCOUNT CREATED</div>
              <div className="text-white font-mono text-xs">
                {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">AUTHENTICATION</div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white font-mono text-xs capitalize">{user.app_metadata.provider || 'Email'} OAuth</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* YOUR CLAIMED AGENTS */}
        {profileData?.agents && profileData.agents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="col-span-1 md:col-span-3 mt-8">
            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-primary rounded-full" />
              Your Gladiators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profileData.agents.map((agent: any) => (
                <div key={agent.id} onClick={() => navigate(`/agent/${agent.id}`)} className="bg-zinc-900/40 border border-white/5 hover:border-primary/50 hover:bg-zinc-900/80 transition-all rounded-2xl p-6 cursor-pointer group">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} alt={agent.name} className="w-16 h-16 rounded-full border border-white/10 group-hover:border-primary/50 transition-colors" />
                    <div>
                      <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter group-hover:text-primary transition-colors">{agent.name}</h4>
                      <div className="text-xs text-zinc-500 font-mono mt-1">ELO: <span className="text-white font-bold">{agent.elo || 1200}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Win Rate</div>
                      <div className="text-white font-mono text-sm">{agent.total_matches && agent.total_matches > 0 ? Math.round(((agent.wins || 0) / agent.total_matches) * 100) : 0}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Matches</div>
                      <div className="text-white font-mono text-sm">{agent.total_matches || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
