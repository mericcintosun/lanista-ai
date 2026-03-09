import { useEffect, useState } from 'react';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Match } from '@lanista/types';
import { API_URL } from '../lib/api';

// Components
import { Button } from './ui/Button';
import { 
  BattleArenaHeader, 
  LiveMatchList, 
  FightersSection, 
  CombatTimeline 
} from './battle-arena';

export function BattleArena() {
  const { matchId: routeMatchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { match, logs } = useCombatRealtime(routeMatchId || null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!routeMatchId) {
      const fetchLiveMatches = async () => {
        try {
          const res = await fetch(`${API_URL}/hub/live`);
          const data = await res.json();
          if (data.matches) setLiveMatches(data.matches);
        } catch (err) {
          console.error('Failed to fetch live matches', err);
        }
      };

      fetchLiveMatches();
      const interval = setInterval(fetchLiveMatches, 5000);
      return () => clearInterval(interval);
    }
  }, [routeMatchId]);

  return (
    <div className="min-h-[90vh] flex flex-col items-center relative overflow-hidden px-6 pb-24">
      {/* Background Flair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-6xl flex flex-col items-center">
        <BattleArenaHeader />

        {!routeMatchId ? (
          <LiveMatchList matches={liveMatches} />
        ) : !match ? (
          <div className="flex flex-col items-center justify-center gap-8 min-h-[50vh]">
            <div className="w-16 h-16 border-2 border-zinc-900 border-t-primary rounded-full animate-spin" />
            <div className="space-y-2 text-center">
              <p className="font-mono text-xs text-primary uppercase tracking-[0.2em]">Establishing Combat Link</p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Bridging Avalanche RPC :: Fuji-Testnet</p>
            </div>
          </div>
        ) : match.status === 'aborted' ? (
          <div className="w-full max-w-2xl bg-primary/[0.03] border border-primary/20 p-12 flex flex-col items-center text-center gap-8">
            <ShieldAlert className="w-16 h-16 text-primary opacity-50" />
            <div className="space-y-4">
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Match ended</h2>
              <p className="font-mono text-xs text-zinc-500 max-w-sm leading-relaxed uppercase tracking-widest">
                Combat ended by the arena. <br />
                Connection lost or match aborted.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/hub')}>
              Back to Hub
            </Button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-20">
            <FightersSection match={match} />
            <CombatTimeline match={match} logs={logs} />

            {/* FOOTER ACTIONS */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={`/game-arena/${match.id}`}
                className="px-10 py-5 bg-transparent border border-cyan-500/40 text-cyan-400 font-mono text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] flex items-center gap-3 group"
              >
                Watch in Game
              </Link>
              <Button variant="outline" size="lg" onClick={() => navigate('/hub')}>
                <ChevronLeft className="w-4 h-4 mr-2" /> RETURN TO HUB
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
