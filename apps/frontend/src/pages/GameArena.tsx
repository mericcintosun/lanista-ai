import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { sendToUnity, setUnityMode } from '../lib/unity';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { useHubData } from '../hooks/useHubData';
import { LiveMatchList } from '../components/battle-arena/LiveMatchList';
import { BattleArenaHeader } from '../components/battle-arena/BattleArenaHeader';

// Game Components
import { UnityFrame, CombatStats, CombatLogs } from '../components/game';

export default function GameArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { match, logs, signalReady } = useCombatRealtime(matchId || null);
  const { liveMatches } = useHubData();
  const lastStatus = useRef<string | null>(null);

  // 1. Wait for Unity Readiness
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'unity-ready') {
        console.log('[Arena] Unity signaled readiness. Setting mode 1 and syncing in 3000ms...');
        setUnityMode(iframeRef.current, 1);
        setTimeout(() => {
          signalReady?.();
        }, 3000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [signalReady]);

  // 2. Handle combat conclusion
  useEffect(() => {
    if (!match) return;
    
    const isFinished = match.status === 'finished' || match.status === 'aborted';
    const wasActive = lastStatus.current === 'active' || lastStatus.current === 'pending';

    if (isFinished && wasActive) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF2D2D', '#FFFFFF', '#000000']
      });
    }
    
    lastStatus.current = match.status;
  }, [match]);

  // 2. Unity Bridge Sync (Auto-sync on updates)
  useEffect(() => {
    if (match && iframeRef.current) {
      sendToUnity(iframeRef.current, { match, logs });
    }
  }, [match, logs]);

  // 4. List View if no matchId
  if (!matchId) {
    return (
      <div className="py-8 space-y-8 animate-in fade-in duration-700">
        <BattleArenaHeader title="ARENA" subtitle="// ACTIVE ENGAGEMENTS" />
        <div className="max-w-6xl mx-auto w-full px-4">
          <LiveMatchList matches={liveMatches} />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(255,45,45,0.3)]" />
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-[0.3em] animate-pulse text-center">
          Establishing Neural Link...<br/>
          <span className="text-[10px] opacity-50">Syncing with Arena Oracle</span>
        </div>
      </div>
    );
  }

  const isFinished = match.status === 'finished' || match.status === 'aborted';

  return (
    <div className="py-8 space-y-8 animate-in fade-in duration-700">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-4xl font-black text-white italic uppercase tracking-tighter sm:text-5xl">Live Combat</h1>
            <div className={`px-3 py-1 border rounded font-mono text-[10px] tracking-widest font-black ${
              isFinished ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-primary/20 border-primary/30 text-primary animate-pulse'
            }`}>
              {isFinished ? 'ARCHIVED' : 'LOCKED'}
            </div>
          </div>
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.3em]">Sector: 0x77-B | Neural Convergence: STABLE</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
        {/* Left Column: Game & Logs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <UnityFrame
            ref={iframeRef}
            onRefresh={() => window.location.reload()}
            onFullscreen={() => iframeRef.current?.requestFullscreen()}
            isLoading={!match}
          />
          <CombatStats match={match} />
        </div>

        {/* Right Column: Dynamic HUD */}
        <div className="lg:col-span-4 flex flex-col min-h-[500px]">
          <CombatLogs logs={logs} match={match} />
        </div>
      </div>

    </div>
  );
}
