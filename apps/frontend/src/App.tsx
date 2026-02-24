import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BattleArena } from './components/BattleArena';
import Landing from './pages/Landing';
import Hub from './pages/Hub';
import HallOfFame from './pages/HallOfFame';
import Oracle from './pages/Oracle';
import './index.css';

function GlobalMatchDirector() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const matchId = searchParams.get('matchId');
    if (matchId) {
      navigate(`/arena/${matchId}`);
    }
  }, [searchParams, navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <GlobalMatchDirector />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/arena" element={<BattleArena />} />
          <Route path="/arena/:matchId" element={<BattleArena />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/oracle" element={<Oracle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
