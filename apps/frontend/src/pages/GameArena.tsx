import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { prefetchGameHtml } from '../lib/prefetchGame';
import confetti from 'canvas-confetti';
import { sendToUnity, setUnityMode } from '../lib/unity';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { useHubData } from '../hooks/useHubData';
import { PageHeader } from '../components/common/PageHeader';
import { LiveMatchList } from '../components/battle-arena/LiveMatchList';
import { ArenaChat } from '../components/ArenaChat';
import { PredictionWidget } from '../components/arena/PredictionWidget';
import { Reveal } from '../components/common/Reveal';

// Game Components
import { UnityFrame, CombatStats } from '../components/game';

export default function GameArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const emojiOverlayRef = useRef<HTMLDivElement>(null);

  const { match, logs, signalReady } = useCombatRealtime(matchId || null);
  const { liveMatches } = useHubData();
  const lastStatus = useRef<string | null>(null);

  useEffect(() => {
    prefetchGameHtml();
  }, []);

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
        colors: ['#df7f3e', '#FFFFFF', '#000000']
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
      <div className="py-8 space-y-8">
        <Reveal>
          <div>
            <PageHeader title="ARENA" subtitle="// ACTIVE ENGAGEMENTS" />
            <div className="h-px w-24 mx-auto mt-4 bg-gradient-to-r from-blue-500 via-secondary to-transparent" />
          </div>
        </Reveal>
        <div className="max-w-6xl mx-auto w-full px-4">
          <Reveal delay={0.2} direction="up">
            <LiveMatchList matches={liveMatches} />
          </Reveal>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.3)]" />
        <div className="font-mono text-xs text-zinc-500 uppercase tracking-[0.3em] animate-pulse text-center">
          Loading match...<br/>
          <span className="text-[10px] opacity-50">Connecting to arena</span>
        </div>
      </div>
    );
  }

  const isFinished = match.status === 'finished' || match.status === 'aborted';

  return (
    <div className="max-w-[1600px] mx-auto py-4 sm:py-6 px-4 space-y-4 sm:space-y-6">
      <Reveal>
        <PredictionWidget
          match={match}
          matchId={matchId}
        />
      </Reveal>
      
      {/* ── Match ID & Status (compact) ── */}
      <Reveal className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 py-2 rounded-lg border border-blue-500/20 bg-blue-500/5 w-fit" delay={0.1}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Match ID</span>
          <span className="font-mono text-xs text-white uppercase tabular-nums truncate max-w-[180px] sm:max-w-none" title={matchId}>{matchId}</span>
        </div>
        <div className={`px-2.5 py-1 border rounded font-mono text-[9px] sm:text-[10px] tracking-widest font-black ${
          isFinished ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-secondary/20 border-secondary/30 text-secondary animate-pulse'
        }`}>
          {isFinished ? 'ARCHIVED' : 'LIVE'}
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Main: Unity & Stats — mobile: 2nd, desktop: left 8 cols */}
        <Reveal className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 order-2 lg:order-1" direction="left" delay={0.2}>
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 via-transparent to-secondary/20 rounded-2xl blur-sm opacity-50" />
            <div className="relative">
              <UnityFrame
                ref={iframeRef}
                onRefresh={() => window.location.reload()}
                onFullscreen={() => iframeRef.current?.requestFullscreen()}
                isLoading={!match}
              />
              <div
                ref={emojiOverlayRef}
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                aria-hidden
              />
            </div>
          </div>
          
          <CombatStats match={match} />
        </Reveal>

        {/* Chat — same height as game column (Twitch/Kick style) */}
        <Reveal className="lg:col-span-4 flex flex-col min-h-[400px] lg:min-h-0 order-1 lg:order-2" direction="right" delay={0.3}>
          <ArenaChat
            matchId={matchId}
            match={match}
            unityIframeRef={iframeRef}
            gameEmojiContainerRef={emojiOverlayRef}
            className="flex-1 min-h-[400px] lg:min-h-0 w-full"
          />
        </Reveal>
      </div>
    </div>
  );
}
