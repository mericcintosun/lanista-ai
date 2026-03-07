import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Swords } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { sendToUnity, setUnityMode } from '../lib/unity';
import { useCombatRealtime } from '../hooks/useCombatRealtime';
import { useHubData } from '../hooks/useHubData';
import { PageHeader } from '../components/common/PageHeader';
import { LiveMatchList } from '../components/battle-arena/LiveMatchList';
import { ArenaChat } from '../components/ArenaChat';
import { PredictionWidget } from '../components/arena/PredictionWidget';
import { Reveal } from '../components/common/Reveal';

// Game Components
import { UnityFrame, CombatStats, CombatLogs } from '../components/game';

export default function GameArena() {
  const { matchId } = useParams<{ matchId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

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
      <div className="py-8 space-y-8">
        <Reveal>
          <PageHeader title="ARENA" subtitle="// ACTIVE ENGAGEMENTS" />
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
    <div className="max-w-[1600px] mx-auto py-4 sm:py-6 px-4 space-y-4 sm:space-y-6">
      <Reveal>
        <PredictionWidget
          match={match}
          matchId={matchId}
          session={session}
        />
      </Reveal>
      
      {/* ── INTEGRATED TOOLBAR ── */}
      <Reveal className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 glass border-white/5 bg-white/[0.02] rounded-xl" delay={0.1}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-black text-white italic uppercase tracking-tighter leading-none">Combat Feed</h1>
            <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Live Telemetry Link Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
             <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Protocol ID</span>
             <span className="font-mono text-xs text-white uppercase tabular-nums">#{matchId?.substring(0, 12)}</span>
          </div>
          <div className={`px-4 py-1.5 border rounded font-mono text-[10px] tracking-widest font-black ${
            isFinished ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-primary/20 border-primary/30 text-primary animate-pulse'
          }`}>
            {isFinished ? 'STATUS: ARCHIVED' : 'STATUS: LIVE_ENGAGEMENT'}
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Main: Unity & Stats — mobile: 2nd, desktop: left 8 cols */}
        <Reveal className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 order-2 lg:order-1" direction="left" delay={0.2}>
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/20 via-primary/5 to-cyan-500/20 rounded-2xl blur-sm opacity-50" />
            <div className="relative">
              <UnityFrame
                ref={iframeRef}
                onRefresh={() => window.location.reload()}
                onFullscreen={() => iframeRef.current?.requestFullscreen()}
                isLoading={!match}
              />
            </div>
          </div>
          
          <CombatStats match={match} />
          
          <div className="h-[300px] sm:h-[400px] w-full">
            <CombatLogs logs={logs} match={match} />
          </div>
        </Reveal>

        {/* Chat — mobile: 1st (priority), desktop: right 4 cols */}
        <Reveal className="lg:col-span-4 flex flex-col h-full order-1 lg:order-2" direction="right" delay={0.3}>
          <div className="lg:sticky lg:top-24 flex flex-col gap-4 sm:gap-6">
            <ArenaChat
              matchId={matchId}
              session={session}
              match={match}
              unityIframeRef={iframeRef}
            />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
