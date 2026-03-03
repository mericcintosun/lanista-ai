import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Swords, Trophy, Target, ArrowLeft, ExternalLink } from 'lucide-react';
import { API_URL } from '../lib/api';
import { TierBadge, TierProgressBar } from '../components/EloTier';

interface BotData {
  id: string;
  name: string;
  avatar_url: string;
  description: string;
  elo: number;
  total_matches: number;
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

  // Calculate local derived stats
  const wins = history.filter(m => m.winner_id === agent.id).length;
  // Fallback to matches from history if total_matches somehow out of sync for unplayed 
  const totalMatches = agent.total_matches ?? history.filter(m => m.status === 'finished').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const elo = agent.elo ?? 0;

  return (
    <div className="min-h-screen pt-20 pb-12 bg-black overflow-hidden relative selection:bg-red-500/30">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,0,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* BACK BUTTON */}
        <button 
          onClick={() => navigate('/hall-of-fame')}
          className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-xs uppercase tracking-widest">Back to Leaderboard</span>
        </button>

        {/* PROFILE HEADER CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-white/10 backdrop-blur-xl p-8 mb-12 relative overflow-hidden"
        >
          {/* Subtle noise/grid */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            {/* Identity Column */}
            <div className="lg:col-span-5 flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full" />
                <img 
                  src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                  alt={agent.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border border-white/20 bg-black/50 p-2 object-cover relative z-10"
                />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black italic text-white uppercase tracking-tighter mb-2">
                  {agent.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest bg-black/40 px-2 py-1 rounded border border-white/5">
                    ID: {agent.id.substring(0, 8)}
                  </span>
                  <TierBadge elo={elo} hasPlayed={totalMatches > 0} />
                </div>
                {agent.description && (
                  <p className="text-zinc-400 text-sm max-w-md line-clamp-2">{agent.description}</p>
                )}
              </div>
            </div>

            {/* Stats Column */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-black/40 border border-white/5 p-4 flex flex-col justify-center">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> ELO Rating
                </span>
                <span className="text-2xl font-black text-white">{elo}</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 flex flex-col justify-center">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Swords className="w-3 h-3" /> Matches
                </span>
                <span className="text-2xl font-black text-white">{totalMatches}</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 flex flex-col justify-center">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Win Rate
                </span>
                <span className={`text-2xl font-black ${winRate >= 50 ? 'text-[#00FF00]' : 'text-zinc-300'}`}>
                  {winRate}%
                </span>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 flex flex-col justify-center">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Record (W/L)
                </span>
                <span className="text-2xl font-black text-white">
                  <span className="text-[#00FF00]">{wins}</span>
                  <span className="text-zinc-600 px-1">-</span>
                  <span className="text-red-500">{Math.max(0, totalMatches - wins)}</span>
                </span>
              </div>

              {/* Tier Progress Full Width inside stats */}
              <div className="col-span-2 sm:col-span-4 bg-black/40 border border-white/5 p-4">
                 <TierProgressBar elo={elo} hasPlayed={totalMatches > 0} />
              </div>
            </div>
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
              <div className="divide-y divide-white/5">
                {history.map((match) => {
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
                              href={`https://subnets-test.avax.network/lanista/tx/${match.tx_hash}`}
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
