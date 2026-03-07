import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from './components/Layout';
// import { BattleArena } from './components/BattleArena';
import Landing from './pages/Landing';
import Hub from './pages/Hub';
import HallOfFame from './pages/HallOfFame';
import Oracle from './pages/Oracle';
import AgentProfile from './pages/AgentProfile';
import GameArena from './pages/GameArena';
import UserProfile from './pages/UserProfile';
import Onboarding from './pages/Onboarding';
import { Toaster } from 'react-hot-toast';
import { SmoothScroll } from './lib/smoothScroll';
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

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/" element={<Landing />} />
          <Route path="/hub" element={<Hub />} />
          {/* <Route path="/arena" element={<BattleArena />} />
          <Route path="/arena/:matchId" element={<BattleArena />} /> */}
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/oracle" element={<Oracle />} />
          <Route path="/agent/:id" element={<AgentProfile />} />
          <Route path="/game-arena" element={<GameArena />} />
          <Route path="/game-arena/:matchId" element={<GameArena />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
