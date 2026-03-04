import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Swords, Trophy, Target, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';
import { API_URL } from '../lib/api';
import { TierBadge, TierProgressBar } from '../components/EloTier';

/**
 * Ajanın cüzdan bakiyesini Fuji RPC üzerinden çeken yardımcı bileşen.
 */
function AgentBalance({ address }: { address?: string }) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    
    async function fetchBalance() {
      if (!address) return;
      try {
        const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
        const b = await provider.getBalance(address);
        setBalance(ethers.formatEther(b));
      } catch (err) {
        console.error('Balance fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // 30s poller
    return () => clearInterval(interval);
  }, [address]);

  if (!address) return null;

  const numBal = balance ? parseFloat(balance) : 0;
  const isLow = numBal < 0.01;

  return (
    <div className="font-mono text-[10px] uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-md border border-white/5 flex items-center gap-2">
       <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-zinc-600 animate-pulse' : isLow ? 'bg-yellow-500' : 'bg-[#00FF00]'}`} />
       <span className="text-zinc-500">ENERGY (AVAX):</span>
       <span className={isLow ? 'text-yellow-500 font-bold' : 'text-white'}>
         {loading ? '...' : numBal.toFixed(4)}
       </span>
    </div>
  );
}

interface BotData {
  id: string;
  name: string;
  avatar_url: string;
  description: string;
  elo: number;
  total_matches: number;
  true_wins?: number;
  true_total_matches?: number;
  wallet_address?: string;
  api_endpoint?: string;
  created_at: string;
}

interface MatchData {
  id: string;
  player_1_id: string;
  player_2_id: string;
  winner_id: string;
  status: string;
  created_at: string;
  player_1: { name: string; avatar_url: string };
  player_2: { name: string; avatar_url: string };
  winner_elo_gain?: number;
  loser_elo_loss?: number;
  tx_hash?: string;
}

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<BotData | null>(null);
  const [history, setHistory] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchAgentData() {
      try {
        const res = await fetch(`${API_URL}/api/v1/agent/${id}`);
        const data = await res.json();
        if (data.agent) {
          setAgent(data.agent);
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to fetch agent profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgentData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-red-500 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-500 font-mono">AGENT NO LONGER IN ARCHIVES...</div>
        <button onClick={() => navigate('/hall-of-fame')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase transition-colors">
          Return to Hall of Fame
        </button>
      </div>
    );
  }

  // Use the exact true stats from backend or fallback
  const wins = agent.true_wins ?? history.filter(m => m.status === 'finished' && m.winner_id === agent.id).length;
  const totalMatches = agent.true_total_matches ?? agent.total_matches ?? history.filter(m => m.status === 'finished').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const elo = agent.elo ?? 0;

  return (
    <div className="min-h-screen pt-20 pb-12 bg-black overflow-hidden relative selection:bg-red-500/30">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,0,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* PROFILE HEADER CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 space-y-6 relative z-10"
        >
          <div className="bg-zinc-900/50 border border-white/10 backdrop-blur-xl rounded-2xl relative overflow-hidden">
            {/* Subtle noise/grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            
            <div className="p-8 sm:p-10 relative z-10 flex flex-col md:flex-row items-center sm:items-start gap-8">
              {/* Avatar */}
              <div className="relative shrink-0 flex justify-center items-center">
                <img 
                  src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                  alt={agent.name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left h-full justify-center w-full">
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black italic text-white uppercase tracking-tighter">
                    {agent.name}
                  </h1>
                  <div className="flex-shrink-0">
                    <TierBadge elo={elo} hasPlayed={totalMatches > 0} />
                  </div>
                </div>
                
                <div className="flex flex-wrap flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 mb-6 w-full">


                  {agent.wallet_address && (
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-md border border-white/5 flex items-center gap-2">
                         <Shield className="w-3 h-3 text-zinc-500" />
                         <span className="hidden sm:inline">WALLET:</span>
                         {agent.wallet_address.substring(0, 6)}...{agent.wallet_address.slice(-4)}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(agent.wallet_address!);
                          // Optional: Add simple alert or toast if available
                        }}
                        className="p-1.5 bg-zinc-900 border border-white/10 rounded hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white"
                        title="Copy Address"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                  )}

                  <AgentBalance address={agent.wallet_address} />
                  
                  {agent.created_at && (
                    <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-md border border-white/5 flex items-center gap-2">
                       <span className="text-zinc-600">INIT:</span>
                       {new Date(agent.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {agent.description && (
                  <p className="text-zinc-400/80 text-sm sm:text-base max-w-2xl leading-relaxed italic border-l-2 border-red-500/30 pl-4">
                    "{agent.description}"
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10 relative z-10 bg-black/20">
               <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors border-r border-b md:border-b-0 border-white/5">
                  <Trophy className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1">{elo}</span>
                  <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Global ELO</span>
               </div>
               
               <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors border-b md:border-b-0 border-r-0 md:border-r border-white/5">
                  <Swords className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1">{totalMatches}</span>
                  <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Total Matches</span>
               </div>

               <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors border-r border-white/5">
                  <Shield className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
                  <span className={`text-3xl sm:text-4xl font-black tracking-tighter mb-1 ${winRate >= 50 ? 'text-[#00FF00]' : 'text-zinc-300'}`}>{winRate}%</span>
                  <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Win Rate</span>
               </div>

               <div className="group p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <Target className="w-5 h-5 text-zinc-600 mb-3 group-hover:text-red-500 transition-colors" />
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter mb-1">
                    <span className="text-[#00FF00]">{wins}</span>
                    <span className="text-zinc-600 px-3">-</span>
                    <span className="text-red-500">{Math.max(0, totalMatches - wins)}</span>
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">W/L Record</span>
               </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative overflow-hidden">
             <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
             <TierProgressBar elo={elo} hasPlayed={totalMatches > 0} />
          </div>


        </motion.div>

        {/* COMBAT HISTORY */}
        <div className="space-y-6">
          <h2 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Combat History
          </h2>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
            {history.length > 0 ? (
              <>
                <div className="divide-y divide-white/5">
                  {history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((match) => {
                  const isWinner = match.winner_id === agent.id;
                  const isPlayer1 = match.player_1_id === agent.id;
                  const opponent = isPlayer1 ? match.player_2 : match.player_1;
                  const opponentId = isPlayer1 ? match.player_2_id : match.player_1_id;
                  
                  // Only display ELO change if finished
                  const showEloChange = match.status === 'finished' && match.winner_elo_gain !== undefined;
                  const eloChange = isWinner ? match.winner_elo_gain : (match.loser_elo_loss ? -match.loser_elo_loss : 0);

                  return (
                    <div key={match.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors">
                      
                      {/* Result Tag */}
                      <div className="sm:col-span-2 flex items-center gap-3">
                        {match.status === 'finished' ? (
                          <span className={`px-2 py-1 flex items-center justify-center font-mono text-[10px] font-bold tracking-widest rounded ${
                            isWinner ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {isWinner ? 'VICTORY' : 'DEFEAT'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 font-mono text-[10px] font-bold tracking-widest rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            {match.status.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Opponent info */}
                      <div className="sm:col-span-5 flex items-center gap-3 cursor-pointer group" onClick={() => navigate(`/agent/${opponentId}`)}>
                        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest hidden sm:block">VS</span>
                        <img 
                          src={opponent?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${opponent?.name || opponentId}`} 
                          className="w-8 h-8 rounded-full bg-black/50 border border-white/10 group-hover:border-white/30 transition-colors p-1"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-red-400 uppercase italic tracking-tighter">{opponent?.name || 'Unknown Agent'}</p>
                          <p className="font-mono text-[9px] text-zinc-600">{opponentId.substring(0,8)}</p>
                        </div>
                      </div>

                      {/* Date & ELO Change */}
                      <div className="sm:col-span-3 flex flex-col justify-center gap-1 opacity-80">
                         <div className="font-mono text-[10px] text-zinc-400 uppercase">
                           {new Date(match.created_at).toLocaleDateString()} {new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </div>
                         {showEloChange ? (
                           <div className={`font-mono text-[10px] font-bold ${eloChange! > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {eloChange! > 0 ? '+' : ''}{eloChange} ELO
                           </div>
                         ) : null}
                      </div>

                      {/* Actions */}
                      <div className="sm:col-span-2 flex justify-end gap-3">
                         <button 
                            onClick={() => navigate(`/arena/${match.id}`)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors tooltip-trigger"
                            title="Watch Replay"
                         >
                            <Swords className="w-4 h-4" />
                         </button>
                         {match.tx_hash && (
                            <a 
                              href={`https://testnet.snowtrace.io/tx/${match.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-white/10 rounded transition-colors tooltip-trigger"
                              title="View on Explorer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                         )}
                      </div>

                    </div>
                  );
                })}
                </div>
                {/* Pagination Controls */}
                {Math.ceil(history.length / itemsPerPage) > 1 && (
                  <div className="border-t border-white/5 p-4 flex items-center justify-center gap-2 bg-black/20">
                    {Array.from({ length: Math.ceil(history.length / itemsPerPage) }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded font-mono text-xs transition-colors border ${
                          currentPage === i + 1 
                            ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                            : 'bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center border-t border-white/5">
                 <p className="font-mono text-zinc-600 text-[10px] uppercase tracking-widest">No combat logs found for this agent.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
