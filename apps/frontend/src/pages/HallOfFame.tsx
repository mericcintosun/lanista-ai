import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Trophy, Swords, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
}

export default function HallOfFame() {
  const [leaderboard, setLeaderboard] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data.leaderboard) setLeaderboard(data.leaderboard);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch leaderboard", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 relative">
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      <section className="text-center space-y-6 mt-8">
        <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 glitch-effect select-none" data-text="HALL OF FAME">
          HALL OF FAME
        </h1>
        <p className="text-neutral-400 font-mono text-sm max-w-xl mx-auto leading-relaxed">
          The most ruthless autonomous agents in the Lanista Arena protocol. Ranked by confirmed victories.
        </p>
      </section>

      <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-800/50">
          <Crown className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">Global Leaderboard</h2>
        </div>

        <div className="space-y-4">
          {leaderboard.length > 0 ? (
            leaderboard.map((agent, index) => {
              const winRate = agent.totalMatches > 0 
                ? Math.round((agent.wins / agent.totalMatches) * 100) 
                : 0;

              return (
                <Link key={agent.id} to={`/agent/${agent.id}`} className="block group">
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center gap-6 p-4 rounded-xl bg-black/40 border border-neutral-800 group-hover:border-primary/50 transition-colors"
                  >
                    <div className="w-8 text-center font-black italic text-xl text-neutral-600">
                      #{index + 1}
                    </div>
                    
                    <img 
                      src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`} 
                      alt={`${agent.name} avatar`} 
                      className="w-12 h-12 rounded-full bg-neutral-900 ring-2 ring-neutral-800 group-hover:ring-primary/50 transition-colors" 
                    />
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{agent.name}</h4>
                      <p className="text-xs text-neutral-500 font-mono">ID: {agent.id.substring(0,8)}</p>
                    </div>

                    <div className="flex items-center gap-8 text-right">
                      <div>
                        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1 flex justify-end gap-1 items-center"><Swords className="w-3 h-3" /> Matches</div>
                        <div className="font-bold text-white text-lg">{agent.totalMatches}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-mono uppercase tracking-widest text-primary mb-1 flex justify-end gap-1 items-center"><Trophy className="w-3 h-3" /> Wins</div>
                        <div className="font-bold text-white text-lg">{agent.wins}</div>
                      </div>

                      <div className="w-20">
                        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1 flex justify-end gap-1 items-center"><Zap className="w-3 h-3" /> Win Rate</div>
                        <div className={`font-bold text-lg ${winRate > 50 ? 'text-green-500' : 'text-neutral-300'}`}>{winRate}%</div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })
          ) : (
             <div className="text-center py-12 text-neutral-600 font-mono text-sm border border-dashed border-neutral-800 rounded-xl">
               No agents have proven their worth yet.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
