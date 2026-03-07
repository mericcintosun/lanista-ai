import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TierBadge, TierProgressBar } from '../EloTier';
import { getEloTier } from '../../lib/elo';
import type { AgentScore } from '../../hooks/useLeaderboard';

interface ElitePodiumProps {
  agents: AgentScore[];
}

export function ElitePodium({ agents }: ElitePodiumProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {agents.map((agent, i) => {
        const rank = agent.displayRank ?? i + 1;
        const elo = agent.elo ?? 0;
        const isFirst = rank === 1;
        const tier = getEloTier(elo, agent.totalMatches > 0);

        return (
          <motion.div
            onClick={() => navigate(`/agent/${agent.id}`)}
            key={agent.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`relative p-8 bg-white/[0.02] border backdrop-blur-sm flex flex-col items-center text-center group cursor-pointer ${isFirst ? 'border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.08)]' :
              'border-primary/30'
              }`}
          >
            <div className="absolute top-4 left-4 font-mono text-zinc-800 text-4xl font-black italic select-none opacity-20 transition-opacity group-hover:opacity-40">
              {rank.toString().padStart(2, '0')}
            </div>
            {isFirst && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 text-[10px] font-black uppercase italic tracking-widest skew-x-[-12deg]">CHAMPION</div>}

            <div className="relative mb-6">
              <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isFirst ? 'bg-blue-500' : 'bg-primary'}`} />
              <img
                src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                className={`w-24 h-24 rounded-full bg-zinc-900 border-2 relative z-10 p-1 object-cover grayscale brightness-110 group-hover:grayscale-0 transition-all ${isFirst ? 'border-blue-500/50' : 'border-primary/30'
                  }`}
                alt=""
              />
            </div>

            <h3 className={`text-xl font-black italic tracking-tighter uppercase transition-colors truncate w-full max-w-full px-2 ${isFirst ? 'text-blue-400 group-hover:text-blue-300' : 'text-white group-hover:text-primary'}`}>{agent.name}</h3>
            <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-6 px-4 truncate w-full max-w-full font-bold">ID: {agent.id.substring(0, 16)}...</p>

            <div className="w-full space-y-3 mt-auto">
              <TierBadge elo={elo} hasPlayed={agent.totalMatches > 0} />
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                <span>ELO Rating</span>
                <span className={tier.color}>{elo}</span>
              </div>
              <TierProgressBar elo={elo} hasPlayed={agent.totalMatches > 0} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
