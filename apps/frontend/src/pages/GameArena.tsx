import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronLeft, RefreshCw, Maximize2 } from 'lucide-react';
import { API_URL } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MatchPlayer {
  name: string;
  hp: number;
  current_hp?: number;
  [key: string]: unknown;
}

interface MatchData {
  id: string;
  status: string; // backend: 'active' | 'finished' | 'pending' | 'aborted'
  winner_id: string | null;
  player_1_id: string;
  player_2_id: string;
  player_1: MatchPlayer;
  player_2: MatchPlayer;
  [key: string]: unknown;
}

interface CombatResponse {
  match: MatchData;
  logs: unknown[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(s: string) {
  return s === 'active' || s === 'pending';
}

/** Convert backend status to what Unity expects */
function unityStatus(s: string) {
  return (s === 'finished' || s === 'aborted') ? 'finished' : 'ongoing';
}

// ─── Safe bridge into the Unity iframe ───────────────────────────────────────
function callUnity(iframe: HTMLIFrameElement | null, fn: string, arg: string | number) {
  try {
    const win = iframe?.contentWindow as unknown as Record<string, unknown>;
    if (typeof win?.[fn] === 'function') {
      (win[fn] as (a: string | number) => void)(arg);
    } else {
      console.warn(`[GameArena] Unity fn not found: ${fn}`);
    }
  } catch (e) {
    console.warn('[GameArena] bridge error:', e);
  }
}

/**
 * Forward API response to Unity, converting status to Unity format.
 * We pass the data as-is (matching what Unity expects per README)
 * but translate status from backend terms to Unity terms.
 */
function sendToUnity(
  iframe: HTMLIFrameElement | null,
  data: CombatResponse,
  statusOverride?: string
) {
  const payload = {
    match: {
      ...data.match,
      status: statusOverride ?? unityStatus(data.match.status),
    },
    logs: data.logs,
  };
  const json = JSON.stringify(payload);
  console.log(`[GameArena] → Unity: status=${payload.match.status} logs=${data.logs.length}`);
  callUnity(iframe, 'LoadJsonGameData', json);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GameArena() {
  const { matchId: routeMatchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitRef   = useRef(false);

  const [isUnityReady, setIsUnityReady] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{
    p1: string; p2: string; status: string; winnerId?: string | null;
    p1Id: string;
  } | null>(null);
  const [progress, setProgress] = useState<{ cur: number; total: number } | null>(null);

  // ── Timer cleanup ──────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (intervalRef.current) {
      // @ts-expect-error type hack
      if (typeof intervalRef.current.unref === 'function') intervalRef.current.unref();
      else clearInterval(intervalRef.current as any);
    }
    if (readyPollRef.current) clearInterval(readyPollRef.current);
  }, []);

  useEffect(() => () => clearAll(), [clearAll]);

  // ── Unity ready-check ──────────────────────────────────────────────────────
  const startReadyPolling = useCallback(() => {
    if (readyPollRef.current) clearInterval(readyPollRef.current);
    readyPollRef.current = setInterval(() => {
      try {
        const win = iframeRef.current?.contentWindow as unknown as Record<string, unknown>;
        if (win?.MyGameInstance) {
          setIsUnityReady(true);
          clearInterval(readyPollRef.current!);
        }
      } catch { /* cross-origin guard – should not fire (same origin) */ }
    }, 500);
  }, []);

  // ── Core replay engine ─────────────────────────────────────────────────────
  const startReplay = useCallback(async (matchId: string) => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    // 1. Fetch current match state
    let data: CombatResponse;
    try {
      const res = await fetch(`${API_URL}/combat/status?matchId=${matchId}`);
      data = await res.json();
    } catch {
      console.error('[GameArena] Failed to fetch match');
      return;
    }

    const { match, logs } = data;
    const p1Id    = match.player_1_id;
    const p1Name  = match.player_1?.name ?? 'Fighter A';
    const p2Name  = match.player_2?.name ?? 'Fighter B';
    const alreadyFinished = !isActive(match.status);

    console.log(
      `[GameArena] ${p1Name} vs ${p2Name} ` +
      `status=${match.status} logs=${logs.length} finished=${alreadyFinished}`
    );

    setMatchInfo({
      p1: p1Name, p2: p2Name,
      status: match.status,
      winnerId: match.winner_id,
      p1Id,
    });

    // 2. Init Unity in iFrame mode
    callUnity(iframeRef.current, 'SetMode', 1);
    await new Promise(r => setTimeout(r, 800)); // let SetMode take effect

    // 3. Send initial frame with no logs (both at full HP, establishes names)
    sendToUnity(iframeRef.current, {
      match: { ...match, status: 'active' },
      logs: [],
    }, 'ongoing');
    console.log('[GameArena] Frame 0 sent (idle, establishes player names)');

    // ── Signal ready to backend ──────────────────────────────────────────────
    // If the match is still active (just starting), let the worker know
    // we're ready to watch, so it can begin the combat loop.
    if (match.status === 'active' || match.status === 'pending') {
      try {
        await fetch(`${API_URL}/combat/viewer-ready`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId })
        });
        console.log('[GameArena] Sent viewer-ready signal to backend');
      } catch (err) {
        console.warn('[GameArena] Failed to send viewer-ready signal', err);
      }
    }

    await new Promise(r => setTimeout(r, 400));

    // ── Unified Replay & Live Engine ─────────────────────────────────────────
    // Unity needs ~1.2s to play each animation. Instead of dumping all logs at once,
    // we queue them and feed Unity ONE BY ONE.
    // 1. Poller: Fetches new logs from API in background.
    // 2. Dispatcher: Sends logs to Unity every 1.2s and triggers Winner banner at the very end.

    let knownLogs = [...logs];
    let knownMatch = match;
    let isMatchDone = alreadyFinished;
    let sentIdx = 0;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let dispatchTimer: ReturnType<typeof setInterval> | null = null;

    // Cleanup helper for inside the hook
    const cleanLocalTimers = () => {
      if (pollTimer) clearInterval(pollTimer);
      if (dispatchTimer) clearInterval(dispatchTimer);
    };

    // Make sure clearAll also cleans these new local timers if component unmounts.
    // We can hijack intervalRef to store the cleanup function!
    intervalRef.current = {
      // @ts-expect-error - overriding type purely for unmount cleanup
      unref: () => cleanLocalTimers()
    };

    // Poller (Live Match only)
    if (!isMatchDone) {
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/combat/status?matchId=${matchId}`);
          const fresh: CombatResponse = await res.json();
          knownLogs = fresh.logs;
          knownMatch = fresh.match;
          if (!isActive(fresh.match.status)) {
            isMatchDone = true;
            if (pollTimer) clearInterval(pollTimer);
          }
        } catch { /* ignore network error, try again next tick */ }
      }, 1500);
    }

    // Dispatcher
    dispatchTimer = setInterval(() => {
      // 1) Keep sending logs as long as we have them
      if (sentIdx < knownLogs.length) {
        sentIdx++;
        const slice = knownLogs.slice(0, sentIdx);
        
        // We ALWAYS send ongoing while logs are still being dispatched,
        // so Unity doesn't pop "GAME OVER" before the last animation finishes
        sendToUnity(iframeRef.current, {
          match: { ...knownMatch, status: 'active' }, 
          logs: slice 
        }, 'ongoing');

        setProgress({ cur: sentIdx, total: knownLogs.length });
      } 
      // 2) We sent all logs, and the backend says the match is done
      else if (isMatchDone && sentIdx >= knownLogs.length) {
        cleanLocalTimers();
        
        // Wait 2.5 seconds for Unity to finish playing the very last log we just sent
        setTimeout(() => {
          // Now tell Unity the match is ACTUALLY finished
          sendToUnity(iframeRef.current, { match: knownMatch, logs: knownLogs }, 'finished');
          
          // And show our React winner banner
          setMatchInfo(prev => prev ? { ...prev, status: 'finished', winnerId: knownMatch.winner_id } : prev);
        }, 2500);
      }
    }, 1200);

  }, []);

  // ── Trigger startReplay when Unity is ready ───────────────────────────────
  useEffect(() => {
    if (!isUnityReady || !routeMatchId || hasInitRef.current) return;
    startReplay(routeMatchId);
  }, [isUnityReady, routeMatchId, startReplay]);

  // ── Reset everything on matchId change ────────────────────────────────────
  useEffect(() => {
    hasInitRef.current = false;
    setIsUnityReady(false);
    setIframeLoaded(false);
    setMatchInfo(null);
    setProgress(null);
    clearAll();
  }, [routeMatchId, clearAll]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    startReadyPolling();
  };

  const handleRefresh = () => {
    hasInitRef.current = false;
    clearAll();
    setIsUnityReady(false);
    setIframeLoaded(false);
    setMatchInfo(null);
    setProgress(null);
    if (iframeRef.current) iframeRef.current.src = '/lanista-build/index.html';
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement)
      containerRef.current.requestFullscreen().catch(() => {});
    else
      document.exitFullscreen().catch(() => {});
  };

  // Derived display values
  const isFinished  = matchInfo?.status === 'finished';
  const winnerName  = matchInfo
    ? (matchInfo.winnerId === undefined || matchInfo.winnerId === null
        ? null
        : matchInfo.winnerId === matchInfo.p1Id
          ? matchInfo.p1
          : matchInfo.p2)
    : null;

  // ─── No matchId splash ─────────────────────────────────────────────────────
  if (!routeMatchId) {
    return (
      <div className="w-full max-w-[1400px] mx-auto pb-24">
        <section className="text-center space-y-8 pt-12 px-4 flex flex-col items-center justify-center min-h-[25vh]">
          <div className="space-y-4 w-full">
            <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em]">
              // NEURAL SIMULATION ENGINE
            </p>
            <div className="relative inline-block w-full">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.8] break-words px-2">
                GAME ARENA
              </h1>
              <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] text-red-500/30 blur-[2px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.8] pointer-events-none">
                GAME ARENA
              </span>
            </div>
          </div>
        </section>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-12 glass rounded-3xl p-12 relative overflow-hidden flex flex-col items-center gap-8 text-center mx-4"
        >
          <div className="absolute inset-0 noise pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <p className="font-mono text-sm text-white font-black uppercase tracking-widest">No Match Selected</p>
            <p className="font-mono text-xs text-zinc-500 max-w-sm">
              Go to The Hub and click on a live match to watch the battle.
            </p>
          </div>
          <Link
            to="/hub"
            className="relative z-10 px-8 py-4 bg-red-500/10 border border-red-500/40 text-red-500
                       font-mono text-xs font-black uppercase tracking-widest rounded-xl
                       hover:bg-red-500/20 hover:border-red-500 transition-all"
          >
            Go to The Hub
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Match viewer ──────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12 space-y-3">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 px-1">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/hub')}
            className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Hub
          </button>

          {/* Status dot + label */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              isUnityReady
                ? isFinished
                  ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]'
                  : 'bg-[#00FF00] shadow-[0_0_6px_rgba(0,255,0,0.7)]'
                : 'bg-zinc-700 animate-pulse'
            }`} />
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
              {!isUnityReady
                ? (iframeLoaded ? 'Starting...' : 'Loading...')
                : isFinished
                  ? 'Finished'
                  : progress
                    ? `Turn ${progress.cur} / ${progress.total}`
                    : 'Live'}
            </span>
          </div>

          {matchInfo && (
            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider hidden sm:block">
              {matchInfo.p1} <span className="text-red-500/60">vs</span> {matchInfo.p2}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFinished && (
            <span className="px-2 py-0.5 rounded font-mono text-[9px] font-black uppercase tracking-widest border border-green-500/30 bg-green-500/10 text-green-400">
              Finished
            </span>
          )}
          <Link
            to={`/arena/${routeMatchId}`}
            className="font-mono text-[9px] text-zinc-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            Classic <ExternalLink className="w-2.5 h-2.5" />
          </Link>
          <button onClick={handleRefresh} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Game viewport ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl"
        style={{ aspectRatio: '16 / 9' }}
      >
        {/* Loading overlay */}
        <AnimatePresence>
          {!isUnityReady && (
            <motion.div
              initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-black"
            >
              <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-mono text-[10px] text-red-500 uppercase tracking-[0.4em]">
                  {iframeLoaded ? 'Initializing Engine' : 'Loading WebGL Build'}
                </p>
                <p className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">
                  {iframeLoaded ? 'Unity runtime starting...' : '~17MB brotli — may use cache'}
                </p>
              </div>
              <div className="w-48 h-px bg-zinc-900 relative overflow-hidden rounded-full">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-red-500"
                  animate={{ width: iframeLoaded ? '75%' : '25%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner banner */}
        <AnimatePresence>
          {isUnityReady && isFinished && winnerName && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-2xl
                         bg-black/70 border border-green-500/40 backdrop-blur-sm text-center"
            >
              <p className="font-mono text-[9px] text-green-400 uppercase tracking-[0.4em] mb-0.5">Winner</p>
              <p className="font-black text-white text-xl italic uppercase tracking-tight">{winnerName}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <iframe
          ref={iframeRef}
          src="/lanista-build/index.html"
          title="Lanista Game Arena"
          onLoad={handleIframeLoad}
          allow="fullscreen"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[9px] text-zinc-700 uppercase tracking-widest">
          Unity WebGL · iFrame Mode · Avalanche Fuji
        </span>
        <span className="font-mono text-[9px] text-zinc-700 uppercase tracking-widest">
          {routeMatchId.substring(0, 8)}...
        </span>
      </div>
    </div>
  );
}
