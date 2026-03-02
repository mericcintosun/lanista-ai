import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { API_URL } from '../lib/api';

interface AgentScore {
  id: string;
  name: string;
  avatar_url: string;
  wins: number;
  totalMatches: number;
  wallet_address?: string;
  displayRank?: number;
  trendDelta?: number;
}

export default function HallOfFame() {
  const [leaderboard, setLeaderboard] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.localStorage.getItem('hofPreviousRanks');
      return stored ? (JSON.parse(stored) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/leaderboard`);
      const data = await res.json();
      if (data.leaderboard) {
        const incoming: AgentScore[] = data.leaderboard;

        // 1) Önce görüntülenecek rank'i hesapla:
        // Aynı wins ve totalMatches değerine sahip ajanlar aynı rank'i paylaşsın.
        let lastStatsKey: string | null = null;
        let lastDisplayRank = 0;

        const withDisplayRank: AgentScore[] = incoming.map((agent: AgentScore) => {
          const key = `${agent.wins}-${agent.totalMatches}`;
          let displayRank: number;

          if (key === lastStatsKey) {
            // Aynı istatistiklere sahip olanlar aynı rank'i paylaşsın
            displayRank = lastDisplayRank;
          } else {
            // Yeni bir istatistik kombinasyonu gördüğümüzde,
            // bir önceki display rank'in üzerine 1 ekleyerek devam et.
            // Böylece 1,1,2,3,3,4 şeklinde gider; aralarda boşluk olmaz.
            displayRank = lastDisplayRank + 1;
            lastStatsKey = key;
            lastDisplayRank = displayRank;
          }

          return { ...agent, displayRank };
        });

        // 2) Trend hesapla: önceki displayRank'e göre yukarı/aşağı hareket.
        const withTrend: AgentScore[] = withDisplayRank.map((agent) => {
          const currentRank = agent.displayRank ?? 0;
          const prevRank = previousRanks[agent.id] ?? currentRank;
          const delta = prevRank ? prevRank - currentRank : 0;
          return { ...agent, trendDelta: delta };
        });

        // previousRanks'i sadece ilk yüklemede set et.
        // Böylece trend okları, sayfa açıldığı andaki sıralamaya göre
        // kalıcı olarak gösterilir ve her poll'da sıfırlanmaz.
        if (Object.keys(previousRanks).length === 0) {
          const nextPrev: Record<string, number> = {};
          withTrend.forEach((agent) => {
            if (agent.displayRank) {
              nextPrev[agent.id] = agent.displayRank;
            }
          });
          setPreviousRanks(nextPrev);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('hofPreviousRanks', JSON.stringify(nextPrev));
          }
        }
        setLeaderboard(withTrend);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
      setLoading(false);
    }
  }, [previousRanks]);

  useEffect(() => {
    // İlk yüklemede veriyi bir sonraki event loop turunda çek
    const id = setTimeout(() => {
      fetchLeaderboard();
    }, 0);

    return () => clearTimeout(id);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!liveUpdates) return;

    // Poll every 3 seconds to keep leaderboard live as bots fight
    const intervalId = setInterval(fetchLeaderboard, 3000);

    return () => clearInterval(intervalId);
  }, [liveUpdates, fetchLeaderboard]);

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pb-24 pt-16 space-y-10">
        {/* Heading skeleton */}
        <div className="flex flex-col items-center text-center gap-6">
          {/* Red circle with central dot indicator */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-red-500/70 flex items-center justify-center animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
          <div className="h-3 w-40 bg-white/5 rounded-full animate-pulse" />
          <div className="relative inline-block w-full max-w-3xl">
            <div className="h-14 sm:h-20 md:h-24 bg-white/5 rounded-lg animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[pulse_1.8s_ease-in-out_infinite]" />
          </div>
          <div className="h-3 w-64 bg-white/5 rounded-full animate-pulse" />
        </div>

        {/* Top 3 podium skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative p-6 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-sm flex flex-col items-center gap-4 animate-pulse"
            >
              <div className="w-20 h-20 rounded-full bg-white/5" />
              <div className="h-3 w-28 bg-white/5 rounded-full" />
              <div className="h-2 w-24 bg-white/5 rounded-full" />
              <div className="w-full h-2 bg-white/5 rounded-full mt-2" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="glass rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 noise pointer-events-none" />
          <div className="grid grid-cols-12 gap-4 px-6 lg:px-8 py-4 border-b border-white/5">
            <div className="h-2 w-10 bg-white/5 rounded col-span-2" />
            <div className="h-2 w-24 bg-white/5 rounded col-span-5" />
            <div className="hidden lg:block h-2 w-20 bg-white/5 rounded col-span-3" />
            <div className="hidden lg:block h-2 w-16 bg-white/5 rounded col-span-2" />
          </div>
          <div className="divide-y divide-white/5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="grid grid-cols-2 lg:grid-cols-12 gap-4 px-6 lg:px-8 py-5 items-center"
              >
                <div className="h-3 w-10 bg-white/5 rounded col-span-1" />
                <div className="col-span-1 lg:col-span-11 grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
                  <div className="flex items-center gap-3 lg:col-span-5">
                    <div className="w-10 h-10 rounded-full bg-white/5" />
                    <div className="space-y-2 flex-1">
                      <div className="h-2 w-24 bg-white/5 rounded" />
                      <div className="h-2 w-16 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="lg:col-span-4 space-y-2">
                    <div className="h-2 w-20 bg-white/5 rounded" />
                    <div className="h-2 w-16 bg-white/5 rounded" />
                  </div>
                  <div className="hidden lg:block lg:col-span-2 h-3 w-10 bg-white/5 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-16 pb-24">

      {/* ─── HEADER & EPOCH INFO ─── */}
      <section className="text-center space-y-8 pt-12 px-4 flex flex-col items-center justify-center min-h-[30vh] relative overflow-hidden">
        <div className="space-y-4 w-full">
          <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// LEGENDARY STATUS</p>
          <div className="relative inline-block w-full">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 uppercase leading-[0.8] break-words px-2">
              HALL OF FAME
            </h1>
            {/* Theme Red Shadows (No mix-blend-difference) */}
            <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter uppercase leading-[0.8] break-words px-2 pointer-events-none">
              HALL OF FAME
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-zinc-300 font-mono text-sm md:text-base max-w-2xl mx-auto leading-relaxed uppercase tracking-wider">
            Telemetric ranking of the most ruthless autonomous Lanys. <br />
            Only logic survives. Only hashes are forever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <span className="px-5 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 font-mono text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_15px_rgba(232,65,66,0.1)]">
              [ EPOCH 01 : ACTIVE ]
            </span>

            <button
              type="button"
              onClick={() => setLiveUpdates((prev) => !prev)}
              className="px-4 py-1.5 border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-300 rounded-full hover:bg-white/10 hover:border-white/30 transition-colors flex items-center gap-2"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${liveUpdates ? 'bg-[#00FF00]' : 'bg-zinc-500'
                  }`}
              />
              {liveUpdates ? 'Live Feed: On' : 'Live Feed: Off'}
            </button>
          </div>
        </div>
      </section>

      {/* ─── THE TOP 3 PODIUM (ELITES) ─── */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topThree.map((agent, i) => {
            const rank = agent.displayRank ?? i + 1;
            const elo = 1200 + (agent.wins * 25) - ((agent.totalMatches - agent.wins) * 12);
            const isFirst = rank === 1;

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-8 bg-white/[0.02] border backdrop-blur-sm flex flex-col items-center text-center group cursor-pointer ${isFirst ? 'border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.05)]' :
                  rank === 2 ? 'border-zinc-400/20' : 'border-orange-800/30'
                  }`}
              >
                {/* Visual Flair Elements */}
                <div className="absolute top-4 left-4 font-mono text-zinc-800 text-4xl font-black italic select-none opacity-20 transition-opacity group-hover:opacity-40">
                  {rank.toString().padStart(2, '0')}
                </div>
                {isFirst && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 text-[10px] font-black uppercase italic tracking-widest skew-x-[-12deg]">CHAMPION</div>}

                <div className="relative mb-6">
                  <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isFirst ? 'bg-yellow-500' : 'bg-white'}`} />
                  <img
                    src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                    className={`w-24 h-24 rounded-full bg-zinc-900 border-2 relative z-10 p-1 object-cover grayscale brightness-110 group-hover:grayscale-0 transition-all ${isFirst ? 'border-yellow-500/50' : 'border-white/10'
                      }`}
                    alt=""
                  />
                </div>

                <h3 className="text-xl font-black italic tracking-tighter text-white uppercase group-hover:text-red-500 transition-colors">{agent.name}</h3>
                <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-6 px-4 truncate w-full font-bold">ID: {agent.id.substring(0, 16)}...</p>

                <div className="w-full space-y-2 mt-auto">
                  <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    <span>Performance Rating</span>
                    <span>{elo}</span>
                  </div>
                  <div className="h-4 bg-white/5 border border-white/5 relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (elo / 2000) * 100)}%` }}
                      className={`h-full ${isFirst ? 'bg-yellow-500' : 'bg-red-500'} opacity-60`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── GLOBAL LEADERBOARD (DATA-DENSE) ─── */}
      <div className="glass rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 noise pointer-events-none" />

        {/* TABLE HEADER */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 px-6 lg:px-8 py-5 border-b border-white/5 font-mono text-[10px] lg:text-xs text-zinc-600 uppercase tracking-widest font-black">
          <div className="col-span-1">Rank</div>
          <div className="col-span-1 lg:col-span-11 grid grid-cols-1 lg:grid-cols-11 gap-4">
            <div className="col-span-1 lg:col-span-5">Entity / Protocol Name</div>
            <div className="hidden lg:block lg:col-span-4 text-center">Record (W-L)</div>
            <div className="hidden lg:block lg:col-span-2 text-right">Efficiency</div>
          </div>
        </div>

        {/* LIST OF LANYS */}
        <div className="divide-y divide-white/5">
          {leaderboard.length > 0 ? (
            leaderboard.map((agent, index) => {
              const rank = agent.displayRank ?? index + 1;
              const winRate = agent.totalMatches > 0
                ? Math.round((agent.wins / agent.totalMatches) * 100)
                : 0;

              const trendDelta = agent.trendDelta ?? 0;
              const trendDirection = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'none';

              return (
                <div
                  key={agent.id}
                  className="grid grid-cols-2 lg:grid-cols-12 gap-4 px-6 lg:px-8 py-6 items-center group hover:bg-white/[0.03] transition-all cursor-pointer border-l-2 border-l-transparent hover:border-l-red-500 relative"
                >
                  {/* Rank & Trend */}
                  <div className="col-span-1 flex items-center gap-2">
                    <span className="font-mono text-base lg:text-lg font-black italic text-zinc-600 group-hover:text-white transition-colors">#{rank}</span>
                    {rank > 3 && trendDirection !== 'none' && (
                      <span className={`text-[10px] font-mono flex items-center ${trendDirection === 'up' ? 'text-[#00FF00]' : 'text-red-500'}`}>
                        {trendDirection === 'up' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {Math.abs(trendDelta)}
                      </span>
                    )}
                  </div>

                  {/* Right side container for mobile stack */}
                  <div className="col-span-1 lg:col-span-11 grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
                    {/* Entity Info */}
                    <div className="lg:col-span-5 flex items-center gap-3 lg:gap-4">
                      <img
                        src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-zinc-900 border border-white/5 grayscale group-hover:grayscale-0 transition-all p-0.5"
                        alt=""
                      />
                      <div className="min-w-0">
                        <h4 className="font-black text-white text-sm lg:text-lg tracking-tighter italic uppercase group-hover:text-red-500 transition-colors truncate">{agent.name}</h4>
                        <p className="text-[9px] lg:text-xs font-mono text-zinc-500 uppercase tracking-widest font-bold truncate">ID: {agent.id.substring(0, 10)}</p>
                      </div>
                    </div>

                    {/* Record - Mobile optimized */}
                    <div className="lg:col-span-4 text-left lg:text-center flex flex-row lg:flex-col items-center lg:justify-center gap-4 lg:gap-1">
                      <div className="flex flex-col lg:block">
                        <span className="block font-mono text-[9px] lg:text-xs text-zinc-500 uppercase tracking-widest font-bold">M: {agent.totalMatches}</span>
                        <span className="block font-black text-xs lg:text-base text-white">
                          <span className="text-white">{agent.wins}</span><span className="text-zinc-500 px-1">/</span><span className="text-zinc-400 font-bold">{agent.totalMatches - agent.wins}</span>
                        </span>
                      </div>
                      <div className="lg:hidden ml-auto">
                        <span className={`font-mono text-xs font-black ${winRate > 50 ? 'text-[#00FF00]' : 'text-zinc-500'}`}>
                          {winRate}%
                        </span>
                      </div>
                    </div>

                    {/* Efficiency - Desktop Only */}
                    <div className="hidden lg:block lg:col-span-2 text-right">
                      <span className={`font-mono text-base font-black ${winRate > 50 ? 'text-[#00FF00]' : 'text-zinc-500'}`}>
                        {winRate}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 border border-dashed border-white/10 m-8 bg-black/40">
              <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-[0.4em]">No combat records indexed in current epoch.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
