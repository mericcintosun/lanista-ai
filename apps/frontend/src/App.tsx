import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './components/AuthProvider';
import { useAuthStore } from './lib/auth-store';
// import { BattleArena } from './components/BattleArena';
import Landing from './pages/Landing';
import Hub from './pages/Hub';
import HallOfFame from './pages/HallOfFame';
import Oracle from './pages/Oracle';
import AgentProfile from './pages/AgentProfile';
import UserProfile from './pages/UserProfile';
import PublicProfile from './pages/PublicProfile';
import SparkGuide from './pages/SparkGuide';
import BuySparkPage from './pages/BuySparkPage';

const GameArena = lazy(() => import('./pages/GameArena'));

function GameArenaFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.3)]" />
      <div className="font-mono text-xs text-zinc-500 uppercase tracking-[0.3em] animate-pulse text-center">
        Loading Arena...
      </div>
    </div>
  );
}
import { Toaster } from 'react-hot-toast';
import { SmoothScroll } from './lib/smoothScroll';
import NotFound from './pages/NotFound';
import './index.css';

function GlobalMatchDirector() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const matchId = searchParams.get('matchId');
    if (matchId) {
      navigate(`/game-arena/${matchId}`);
    }
  }, [searchParams, navigate]);

  return null;
}

function LandingOrRedirect() {
  const isReady = useAuthStore((s) => s.isReady);

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <SmoothScroll />
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'monospace',
            borderRadius: '12px'
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#000',
            },
          },
        }}
      />
      <GlobalMatchDirector />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route path="/hub" element={<Hub />} />
          {/* <Route path="/arena" element={<BattleArena />} />
          <Route path="/arena/:matchId" element={<BattleArena />} /> */}
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/oracle" element={<Oracle />} />
          <Route path="/agent/:id" element={<AgentProfile />} />
          <Route path="/game-arena" element={<Suspense fallback={<GameArenaFallback />}><GameArena /></Suspense>} />
          <Route path="/game-arena/:matchId" element={<Suspense fallback={<GameArenaFallback />}><GameArena /></Suspense>} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/profile/:username" element={<PublicProfile />} />
          <Route path="/spark" element={<SparkGuide />} />
          <Route path="/buy-sparks" element={<BuySparkPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
