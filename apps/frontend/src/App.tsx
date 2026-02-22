import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BattleArena } from './components/BattleArena';
import Hub from './pages/Hub';
import HallOfFame from './pages/HallOfFame';
import Oracle from './pages/Oracle';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Hub />} />
          <Route path="arena" element={<BattleArena />} />
          <Route path="arena/:matchId" element={<BattleArena />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="oracle" element={<Oracle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
