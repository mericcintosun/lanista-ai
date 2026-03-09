import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { prefetchGameHtml } from '../lib/prefetchGame';
import confetti from 'canvas-confetti';
import { sendToUnity, setUnityMode, sendThrowableToUnity } from '../lib/unity';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { useHubData } from '../hooks/useHubData';
import { useArenaChat } from '../hooks/useArenaChat';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { PageHeader } from '../components/common/PageHeader';
import { LiveMatchList } from '../components/battle-arena/LiveMatchList';
import { ArenaChat } from '../components/ArenaChat';
import { Reveal } from '../components/common/Reveal';
import { WatchRewardBadge } from '../components/arena/WatchRewardBadge';

// Game Components
import { UnityFrame, CombatStats, CombatLogs, MatchInfoBanner, FullscreenHUD } from '../components/game';
import { SupportPanel } from '../components/arena/SupportPanel';

export default function GameArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const emojiOverlayRef = useRef<HTMLDivElement>(null);

  const { match, logs, signalReady } = useCombatRealtime(matchId || null);
  const { liveMatches } = useHubData();
  const lastStatus = useRef<string | null>(null);

  const { setBalance: setSparkBalance } = useSparkBalance();

  const onThrowable = useCallback(
    (payload: { type: 'throwable'; item: 'tomato'; target: 'player_1' | 'player_2' }) => {
      if (iframeRef.current) sendThrowableToUnity(iframeRef.current, payload);
    },
    []
  );

  const chatState = useArenaChat(matchId || null, {
    onThrowable,
    onSpend: (newBalance) => setSparkBalance(newBalance),
  });

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

  const isLobby = match.status === 'pending';

  return (
    <div className="max-w-[1600px] mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-5">
      {/* Watch reward — fixed bottom-left, only during active match */}
      <WatchRewardBadge matchStatus={match.status} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:items-stretch">
        {/* ── Left column: iframe → match info → chat (mobile) → combat stats ── */}
        <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-4 order-1 self-stretch">
          {/* Unity iframe */}
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 via-transparent to-secondary/20 rounded-2xl blur-sm opacity-50 pointer-events-none" />
            <div className="relative">
              <UnityFrame
                ref={iframeRef}
                onRefresh={() => window.location.reload()}
                onFullscreen={() => iframeRef.current?.requestFullscreen()}
                isLoading={!match}
                hudOverlay={
                  match ? (
                    <FullscreenHUD
                      match={match}
                      onRefresh={() => window.location.reload()}
                      onExitFullscreen={() => document.exitFullscreen?.()}
                      chatState={chatState}
                    />
                  ) : undefined
                }
              />
              <div
                ref={emojiOverlayRef}
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                aria-hidden
              />
            </div>
          </div>

          {/* Match info — id, status, p1 vs p2 */}
          <MatchInfoBanner match={match} matchId={matchId} />

          {/* Lobby Prediction Panel for Mobile (Prominent) */}
          {isLobby && (
            <div className="lg:hidden">
              <SupportPanel match={match} />
            </div>
          )}

          {/* Chat + combat logs — only on mobile/tablet */}
          <div className="lg:hidden flex flex-col gap-3">
            {!isLobby && (
              <div className="min-h-[300px] max-h-[45vh]">
                <ArenaChat
                  matchId={matchId}
                  match={match}
                  unityIframeRef={iframeRef}
                  gameEmojiContainerRef={emojiOverlayRef}
                  className="h-full w-full"
                  chatState={chatState}
                />
              </div>
            )}
            <div className="min-h-[150px] max-h-[25vh]">
              <CombatLogs logs={logs} match={match} />
            </div>
          </div>

          {/* Robot HP & stats */}
          <CombatStats match={match} />
        </div>

        {/* ── Right column: Prediction Panel + chat (2/3) + combat logs (1/3), desktop only ── */}
        <div className="hidden lg:flex lg:flex-col lg:col-span-4 order-2 gap-3 sm:gap-4 self-stretch min-h-0 overflow-hidden">
          {/* Desktop Prediction Panel */}
          <SupportPanel match={match} disabled={match.status === 'finished' || match.status === 'aborted'} />

          <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">
            <div className="flex-1 min-h-[300px] overflow-hidden">
              <ArenaChat
                matchId={matchId}
                match={match}
                unityIframeRef={iframeRef}
                gameEmojiContainerRef={emojiOverlayRef}
                className="h-full w-full"
                chatState={chatState}
              />
            </div>
            <div className="h-[250px] shrink-0 overflow-hidden">
              <CombatLogs logs={logs} match={match} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
