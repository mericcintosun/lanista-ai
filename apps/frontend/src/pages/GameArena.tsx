import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { /* ExternalLink, */ ChevronLeft, RefreshCw, Maximize2, Trophy, Swords, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
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
      if (typeof (intervalRef.current as unknown as { unref: () => void }).unref === 'function') {
        (intervalRef.current as unknown as { unref: () => void }).unref();
      } else {
        clearInterval(intervalRef.current as unknown as ReturnType<typeof setInterval>);
      }
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

  useEffect(() => {
    if (isFinished && winnerName) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ef4444', '#dc2626', '#b91c1c', '#ffffff']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ef4444', '#dc2626', '#b91c1c', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isFinished, winnerName]);

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
    <div className="w-full max-w-5xl mx-auto pb-12 px-4 space-y-6">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between glass px-6 py-4 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 noise pointer-events-none opacity-20" />
        
        <div className="flex items-center gap-6 relative z-10">
          <button
            onClick={() => navigate('/hub')}
            className="flex items-center gap-2 font-mono text-xs text-zinc-400 hover:text-white uppercase tracking-widest transition-colors group"
          >
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-red-500/20 group-hover:border-red-500/50 group-hover:text-red-500 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">The Hub</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {isUnityReady && !isFinished && (
                <div className="absolute inset-0 bg-green-500/50 rounded-full animate-ping" />
              )}
              <div className={`w-2.5 h-2.5 rounded-full relative z-10 ${
                isUnityReady
                  ? isFinished
                    ? 'bg-zinc-500 shadow-[0_0_10px_rgba(113,113,122,0.7)]'
                    : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]'
                  : 'bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.7)]'
              }`} />
            </div>
            <span className="font-mono text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
              {!isUnityReady
                ? (iframeLoaded ? 'Initializing' : 'Loading Engine')
                : isFinished
                  ? 'Combat Concluded'
                  : progress
                    ? `Turn ${progress.cur} / ${progress.total}`
                    : 'System Live'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {/* <Link
            to={`/arena/${routeMatchId}`}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 
                       font-mono text-[10px] text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 uppercase tracking-widest transition-all"
          >
            Classic View <ExternalLink className="w-3 h-3" />
          </Link> */}
          <button onClick={handleRefresh} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="w-10 h-10 hidden sm:flex items-center justify-center bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Match Info ─────────────────────────────────────────────────── */}
      {matchInfo && (
        <div className="flex items-center justify-center gap-6 px-4 py-2">
          <div className="text-right">
            <p className="font-black text-xl text-white uppercase tracking-widest">{matchInfo.p1}</p>
          </div>
          <div className="flex items-center justify-center px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <Swords className="w-4 h-4 text-red-500 mr-2" />
            <span className="font-mono text-xs text-red-500 font-bold uppercase tracking-widest">VS</span>
          </div>
          <div className="text-left">
            <p className="font-black text-xl text-white uppercase tracking-widest">{matchInfo.p2}</p>
          </div>
        </div>
      )}

      {/* ── Game viewport ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl group"
        style={{ aspectRatio: '16 / 9' }}
      >
        {/* Loading overlay */}
        <AnimatePresence>
          {!isUnityReady && (
            <motion.div
              initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-zinc-950"
            >
              <div className="absolute inset-0 noise pointer-events-none opacity-30" />
              <div className="w-20 h-20 rounded-full border-2 border-white/5 flex items-center justify-center relative shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
                <Activity className="w-4 h-4 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
              </div>
              <div className="text-center space-y-3 relative z-10 w-full max-w-sm px-4">
                <p className="font-mono text-xs text-red-500 font-bold uppercase tracking-[0.4em]">
                  {iframeLoaded ? 'Initializing Neural Engine' : 'Loading Simulation Environment'}
                </p>
                <div className="w-full h-1 bg-zinc-900 overflow-hidden rounded-full">
                  <motion.div
                    className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    animate={{ width: iframeLoaded ? '85%' : '15%' }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                  />
                </div>
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                  {iframeLoaded ? 'Connecting to Runtime...' : 'Establishing Secure Connection...'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner banner */}
        <AnimatePresence>
          {isUnityReady && isFinished && winnerName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
              className="absolute inset-x-0 top-6 z-10 flex justify-center pointer-events-none"
            >
              <div className="glass px-6 py-3 rounded-2xl border-t border-white/20 border-b border-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 mx-4 pointer-events-auto">
                <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                <div className="flex flex-col items-start leading-tight">
                  <p className="font-mono text-[7px] text-zinc-400 uppercase tracking-[0.3em] opacity-80">Simulation Concluded</p>
                  <p className="font-black text-lg text-white uppercase tracking-tight">
                    {winnerName} <span className="text-red-500">Wins</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <iframe
          ref={iframeRef}
          src="/lanista-build/index.html"
          title="Lanista Game Arena"
          onLoad={handleIframeLoad}
          allow="fullscreen"
          className="w-full h-full border-none block"
        />
      </div>

      {/* ── Footer / CTAs ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4 pt-2">
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
          Protocol ID: {routeMatchId.substring(0, 12)}
        </span>
        
        {isFinished && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleRefresh}
              className="flex-1 sm:flex-none px-6 py-3 bg-white/5 border border-white/10 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all text-center"
            >
              Watch Replay
            </button>
            <button 
              onClick={() => navigate('/hub')}
              className="flex-1 sm:flex-none px-6 py-3 bg-red-500 text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all text-center"
            >
              Return to Hub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
