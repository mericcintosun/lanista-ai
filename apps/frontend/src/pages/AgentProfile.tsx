import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reveal } from '../components/common/Reveal';
import { MagneticButton } from '../components/common/MagneticButton';

// Agent Components
import { AgentHero, MatchHistory } from '../components/agent';
import { AgentLootSection } from '../components/rankUp/AgentLootSection';

import { useAgent } from '../hooks/useAgent';
import { fireTierConfetti } from '../lib/confettiTier';

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agent, history, inventory, loading } = useAgent(id);
  const lastConfettiAgentId = useRef<string | null>(null);

  useEffect(() => {
    if (agent && lastConfettiAgentId.current !== agent.id) {
      lastConfettiAgentId.current = agent.id;
      const elo = agent.elo ?? 0;
      const hasPlayed = (agent.true_total_matches ?? agent.total_matches ?? 0) > 0;
      fireTierConfetti(elo, hasPlayed);
    }
  }, [agent]);

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
        <MagneticButton>
          <button 
            onClick={() => navigate('/hall-of-fame')} 
            className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-widest rounded-xl transition-all"
          >
            Return to Hall of Fame
          </button>
        </MagneticButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-12 pb-24 bg-transparent relative overflow-hidden selection:bg-primary/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="space-y-12">
          <Reveal delay={0.1}>
            <AgentHero agent={agent} history={history} />
          </Reveal>

          <Reveal delay={0.4}>
            <AgentLootSection walletAddress={agent.wallet_address} agentName={agent.name} initialInventory={inventory} />
          </Reveal>

          <Reveal delay={0.5}>
            <MatchHistory history={history} agent={agent} />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
