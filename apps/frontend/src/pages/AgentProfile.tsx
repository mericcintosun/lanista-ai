import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TierProgressBar } from '../components/EloTier';

// Agent Components
import { ProfileHeader, StatsGrid, MatchHistory, DigitalPassportCard } from '../components/agent';

import { useAgent } from '../hooks/useAgent';
import { useRankUpStatus } from '../hooks/useRankUpStatus';
import { RankUpLootBanner } from '../components/rankUp/RankUpLootBanner';
import { AgentLootSection } from '../components/rankUp/AgentLootSection';

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agent, history, loading } = useAgent(id);
  const { status: rankUpStatus, loading: rankUpLoading } = useRankUpStatus(agent?.id ?? null);
  const [rankUpBannerDismissed, setRankUpBannerDismissed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-zinc-500 font-mono text-sm uppercase tracking-widest animate-pulse">// AGENT NO LONGER IN ARCHIVES...</div>
        <button 
          onClick={() => navigate('/hall-of-fame')} 
          className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-widest rounded-xl transition-all"
        >
          Return to Hall of Fame
        </button>
      </div>
    );
  }

  // Stats calculation
  const wins = agent.true_wins ?? history.filter(m => m.status === 'finished' && m.winner_id === agent.id).length;
  const totalMatches = agent.true_total_matches ?? agent.total_matches ?? history.filter(m => m.status === 'finished').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const elo = agent.elo ?? 0;

  return (
    <div className="min-h-screen pt-20 pb-12 bg-black overflow-hidden relative selection:bg-primary/30">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,45,45,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-10 space-y-4"
        >
          <RankUpLootBanner
            status={rankUpStatus ?? null}
            loading={rankUpLoading}
            dismissed={rankUpBannerDismissed}
            onDismiss={() => setRankUpBannerDismissed(true)}
          />
          <ProfileHeader agent={agent} totalMatches={totalMatches} />
          
          <StatsGrid 
            elo={elo} 
            totalMatches={totalMatches} 
            wins={wins} 
            winRate={winRate} 
          />

          <DigitalPassportCard agentId={agent.id} agentName={agent.name ?? 'Agent'} walletAddress={agent.wallet_address} avatarUrl={agent.avatar_url} />

          {/* Progress Bar Section */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4 sm:p-5 relative overflow-hidden">
            <TierProgressBar elo={elo} hasPlayed={totalMatches > 0} />
          </div>

          <AgentLootSection walletAddress={agent.wallet_address} agentName={agent.name} />
        </motion.div>

        <MatchHistory history={history} agent={agent} />
      </div>
    </div>
  );
}
