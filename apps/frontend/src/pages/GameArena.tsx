import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { prefetchGameHtml } from '../lib/prefetchGame';
import confetti from 'canvas-confetti';
import { sendToUnity, setUnityMode, sendThrowableToUnity } from '../lib/unity';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import type { Match, CombatLog } from '@lanista/types';
import { useHubData } from '../hooks/useHubData';
import { useArenaChat } from '../hooks/useArenaChat';
import { useSparkBalance } from '../hooks/useSparkBalance';
import { PageHeader } from '../components/common/PageHeader';
import { LiveMatchList } from '../components/battle-arena/LiveMatchList';
import { ArenaChat } from '../components/ArenaChat';
import { Reveal } from '../components/common/Reveal';
import { WatchRewardBadge } from '../components/arena/WatchRewardBadge';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Game Components
import { UnityFrame, CombatStats, CombatLogs, MatchInfoBanner, LobbyCountdown, FullscreenHUD } from '../components/game';
import { SupportPanel } from '../components/arena/SupportPanel';

/** Compute each player's HP at the baseline moment (before live logs Unity will replay).
 *  Backend's target_current_hp is always the OPPONENT's HP after the action.
 *  For HEAL: actor heals self, target_current_hp = opponent's HP (unchanged). */
function computeBaselineHP(
  allLogs: CombatLog[],
  baselineIdx: number,
  match: Match
): { p1Hp: number; p2Hp: number } {
  const p1Id = match.player_1_id;
  const p1Max = match.p1_final_stats?.hp ?? 0;
  const p2Max = match.p2_final_stats?.hp ?? 0;
  let p1Hp = p1Max;
  let p2Hp = p2Max;

  for (let i = 0; i < baselineIdx && i < allLogs.length; i++) {
    const log = allLogs[i];
    if (log.actor_id === p1Id) {
      p2Hp = log.target_current_hp;
      if (log.action_type === 'HEAL') p1Hp = Math.min(p1Max, p1Hp + log.value);
    } else {
      p1Hp = log.target_current_hp;
      if (log.action_type === 'HEAL') p2Hp = Math.min(p2Max, p2Hp + log.value);
    }
  }
  return { p1Hp, p2Hp };
}

export default function GameArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const emojiOverlayRef = useRef<HTMLDivElement>(null);

  const { match, logs, signalReady } = useCombatRealtime(matchId || null);
  const { liveMatches } = useHubData();
  const lastStatus = useRef<string | null>(null);

  // Refs to always hold latest match/logs — needed for unity-ready handler
  // (setTimeout closure would capture stale state without refs)
  const matchRef = useRef(match);
  const logsRef = useRef(logs);
  useEffect(() => { matchRef.current = match; }, [match]);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  // Unity send guard: never send with logs=0 (puts Unity in a broken "waiting" state that
  // marks P1 as busy and blocks all future animations). Debounce 500ms so batch-arriving
  // logs are coalesced into a single LoadJsonGameData call — avoids rapid repeated resets
  // that trigger "Player 1 is busy". Slow live logs (every 2-3s) still arrive individually.
  const isUnityReadyRef = useRef(false);
  const sendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Baseline: log count when Unity became ready. Logs before this are skipped
  // so mid-match viewers see current HP and only new live actions (like a live stream).
  const baselineLogCountRef = useRef<number>(0);
  // Two-phase finish: send kill blow as 'ongoing' first, then 'finished' after delay
  const sentFinishedRef = useRef(false);
  // Track first send so we can override HP with baseline values (avoids double-counting)
  const firstSendDoneRef = useRef(false);

  const scheduleSendToUnity = useCallback(() => {
    if (!isUnityReadyRef.current) return;
    if (!iframeRef.current || !matchRef.current) return;

    if (sendDebounceRef.current) clearTimeout(sendDebounceRef.current);
    sendDebounceRef.current = setTimeout(() => {
      sendDebounceRef.current = null;
      if (!iframeRef.current || !matchRef.current) return;
      // Only send logs that arrived after Unity became ready (live stream mode)
      const liveLogs = logsRef.current.slice(baselineLogCountRef.current);
      // Allow first send with 0 logs (sets baseline HP for mid-match joins).
      // Block subsequent empty sends to avoid Unity's "Player 1 is busy" state.
      if (liveLogs.length === 0 && firstSendDoneRef.current) return;

      // On FIRST send, override HP with baseline values so Unity doesn't double-count.
      // Unity calls SetHP() only on first data, then replays logs — if we send "latest HP"
      // (which already includes the live logs' damage), the damage gets applied twice.
      let matchToSend = matchRef.current;
      if (!firstSendDoneRef.current) {
        const { p1Hp, p2Hp } = computeBaselineHP(
          logsRef.current, baselineLogCountRef.current, matchRef.current
        );
        matchToSend = {
          ...matchRef.current,
          player_1: { ...matchRef.current.player_1, current_hp: p1Hp },
          player_2: { ...matchRef.current.player_2, current_hp: p2Hp },
        };
        firstSendDoneRef.current = true;
      }

      const isFinished = matchRef.current.status === 'finished' || matchRef.current.status === 'aborted';

      if (isFinished && !sentFinishedRef.current) {
        // Phase 1: send kill blow as 'ongoing' → Unity animates death blow first
        sendToUnity(iframeRef.current, { match: matchToSend, logs: liveLogs }, 'ongoing');
        sentFinishedRef.current = true;
        // Phase 2: after 3s, send with real 'finished' → Unity shows Game Over
        setTimeout(() => {
          if (!iframeRef.current || !matchRef.current) return;
          const finalLogs = logsRef.current.slice(baselineLogCountRef.current);
          sendToUnity(iframeRef.current, { match: matchRef.current, logs: finalLogs });
        }, 3000);
      } else {
        sendToUnity(iframeRef.current, { match: matchToSend, logs: liveLogs });
      }
    }, 500);
  }, []);

  const { setBalance: setSparkBalance } = useSparkBalance();

  const isLobby = match?.status === 'pending';
  const [supportExpanded, setSupportExpanded] = useState(true);
  const wasLobbyRef = useRef(isLobby);

  // Auto-collapse SupportPanel only when transitioning from lobby → active (once per match phase)
  useEffect(() => {
    if (match && wasLobbyRef.current && !isLobby) {
      wasLobbyRef.current = false;
      setSupportExpanded(false);
    }
    if (isLobby) wasLobbyRef.current = true;
  }, [isLobby, match]);

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
      if (event.data?.type === 'UNITY_SIMULATION_READY') {
        console.log('[Arena] Unity signaled readiness. Setting mode 1 and syncing in 5000ms...');
        setUnityMode(iframeRef.current, 1);
        setTimeout(() => {
          // Capture current log count as baseline — skip past logs for mid-match joins
          baselineLogCountRef.current = logsRef.current.length;
          isUnityReadyRef.current = true;
          signalReady?.();
          scheduleSendToUnity();
        }, 5000);
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
      // Delay confetti: 3s for death animation (two-phase finish) + 2s for Game Over screen
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#df7f3e', '#FFFFFF', '#000000']
        });
      }, 5000);
    }
    
    lastStatus.current = match.status;
  }, [match]);

  // 2. Unity Bridge Sync — send once when Unity is ready AND we have logs.
  // Fires when logs first arrive (0→N) or when match status changes.
  // scheduleSendToUnity guards against: no logs, Unity not ready, already sent.
  useEffect(() => {
    scheduleSendToUnity();
  }, [logs.length, match?.status, scheduleSendToUnity]);

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

  return (
    <div className="w-full max-w-[1600px] mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-5 overflow-x-hidden min-w-0">
      {/* Watch reward — fixed bottom-left, only during active match */}
      <WatchRewardBadge matchStatus={match.status} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:items-stretch min-w-0">
        {/* ── Left column: iframe → match info → chat (mobile) → combat stats ── */}
        <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-4 order-1 self-stretch min-w-0 overflow-hidden">
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
          {match && matchId && <MatchInfoBanner match={match} matchId={matchId} />}

          {/* Lobby countdown timer — mobile */}
          <div className="lg:hidden">
            <LobbyCountdown match={match} logsCount={logs.length} />
          </div>

          {/* Prediction Panel for Mobile — collapsible */}
          <div className="lg:hidden min-w-0 overflow-hidden">
            <button
              type="button"
              id="arena-predictions-toggle-mobile"
              aria-expanded={supportExpanded}
              aria-controls="arena-predictions-panel-mobile"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSupportExpanded((prev) => !prev);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 font-mono text-xs uppercase tracking-widest hover:border-amber-500/30 hover:text-zinc-100 transition-colors"
            >
              <span>Arena Predictions</span>
              {supportExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            <div
              id="arena-predictions-panel-mobile"
              role="region"
              aria-labelledby="arena-predictions-toggle-mobile"
              className={`overflow-hidden transition-[max-height] duration-300 ease-out ${supportExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
              <div
                className={`transition-all duration-200 ease-out ${supportExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
              >
                <SupportPanel match={match} disabled={!isLobby} />
              </div>
            </div>
          </div>

          {/* Chat + combat logs — always visible on mobile */}
          <div className="lg:hidden flex flex-col gap-3">
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
            {/* <div className="min-h-[150px] max-h-[25vh]">
              <CombatLogs logs={logs} match={match} />
            </div> */}
          </div>

          {/* Robot HP & stats */}
          {/* <CombatStats match={match} /> */}
        </div>

        {/* ── Right column: Timer + Prediction Panel + chat + combat logs, desktop only ── */}
        <div className="hidden lg:flex lg:flex-col lg:col-span-4 order-2 gap-3 sm:gap-4 self-stretch min-h-0 min-w-0 overflow-hidden">
          {/* Lobby countdown timer */}
          <LobbyCountdown match={match} logsCount={logs.length} />

          {/* Desktop Prediction Panel — collapsible */}
          <div className="min-w-0 flex flex-col overflow-hidden shrink-0">
            <button
              type="button"
              id="arena-predictions-toggle-desktop"
              aria-expanded={supportExpanded}
              aria-controls="arena-predictions-panel-desktop"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSupportExpanded((prev) => !prev);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 font-mono text-xs uppercase tracking-widest hover:border-amber-500/30 hover:text-zinc-100 transition-colors mb-1"
            >
              <span>Arena Predictions</span>
              {supportExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            <div
              id="arena-predictions-panel-desktop"
              role="region"
              aria-labelledby="arena-predictions-toggle-desktop"
              className={`overflow-hidden transition-[max-height] duration-300 ease-out ${supportExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
              <div
                className={`transition-all duration-200 ease-out ${supportExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
              >
                <SupportPanel match={match} disabled={match.status === 'finished' || match.status === 'aborted'} />
              </div>
            </div>
          </div>

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
            {/* <div className="h-[250px] shrink-0 overflow-hidden">
              <CombatLogs logs={logs} match={match} />
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
