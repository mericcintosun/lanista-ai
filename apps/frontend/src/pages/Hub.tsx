import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, History, RefreshCw, ChevronRight } from 'lucide-react';
import type { Match, Bot } from '@lanista/types';
import { supabase } from '../lib/supabase';

export default function Hub() {
  const navigate = useNavigate();

  const [queue, setQueue] = useState<Bot[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = async () => {
    try {
      // 1. Fetch active
      const { data: active } = await supabase
        .from('matches')
        .select('*, player_1:bots!matches_player_1_id_fkey(id, name, avatar_url), player_2:bots!matches_player_2_id_fkey(id, name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      // 2. Fetch history
      const { data: recent } = await supabase
        .from('matches')
        .select('*, player_1:bots!matches_player_1_id_fkey(id, name, avatar_url), player_2:bots!matches_player_2_id_fkey(id, name, avatar_url)')
        .eq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(10);

      // 3. Fetch queue from backend since it tracks redis pool
      const queueRes = await fetch('http://localhost:3001/api/v1/hub/queue').then(r => r.json()).catch(() => ({ queue: [] }));

      if (active) setLiveMatches(active);
      if (recent) setRecentMatches(recent);
      if (queueRes.queue) setQueue(queueRes.queue);
    } catch (err) {
      console.error("Failed to fetch hub data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    // Realtime Aboneliği: Yeni maç başladığında veya bittiğinde listeyi güncelle
    const matchSubscription = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches(); // Değişiklik olunca verileri tazeleyelim
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchSubscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pb-24 pt-16 space-y-10">
        {/* Red circle with central dot indicator */}
      

        {/* Skeleton sections for queue / live / history */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Queue skeleton */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="h-2 w-32 bg-white/5 rounded animate-pulse" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-24 bg-white/5 rounded" />
                    <div className="h-2 w-16 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live engagements skeleton */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="h-2 w-40 bg-white/5 rounded animate-pulse" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-6 py-4 border-b border-white/5 last:border-0">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-2 w-24 bg-white/5 rounded" />
                      <div className="h-2 w-16 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-3 justify-end">
                    <div className="space-y-2 flex-1">
                      <div className="h-2 w-24 bg-white/5 rounded" />
                      <div className="h-2 w-16 bg-white/5 rounded" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent history skeleton */}
          <div className="lg:col-span-12">
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="h-2 w-32 bg-white/5 rounded animate-pulse" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-t border-white/5 first:border-t-0">
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-16 bg-white/5 rounded" />
                    <div className="h-2 w-20 bg-white/5 rounded" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-24 bg-white/5 rounded" />
                    <div className="h-2 w-16 bg-white/5 rounded" />
                  </div>
                  <div className="h-2 w-16 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-24 pb-32">

      {/* ─── PAGE HEADER (HERO) ─── */}
      <section className="text-center space-y-10 pt-12 flex flex-col items-center justify-center min-h-[40vh] px-4">
        <div className="space-y-4 w-full">
          <p className="font-mono text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">// LANISTA DASHBOARD v2.4</p>
          <div className="relative inline-block w-full">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 leading-[0.8] uppercase break-words px-2">
              THE HUB
            </h1>
            {/* Theme Red Shadows (No mix-blend-difference) */}
            <span className="absolute inset-0 z-0 translate-x-[2px] translate-y-[2px] md:translate-x-[4px] md:translate-y-[2px] text-red-500/30 blur-[2px] md:blur-[3px] italic font-black text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] tracking-tighter leading-[0.8] uppercase pointer-events-none">
              THE HUB
            </span>
          </div>
        </div>

        <div className="max-w-3xl space-y-8">
          <p className="text-zinc-400 font-mono text-base md:text-base leading-relaxed uppercase tracking-widest">
            Global battlefield telemetry. <br />
            Monitor neural combat protocols and system engagements.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/"
              className="group px-14 py-5 glass border-white/5 text-white font-black tracking-[0.3em] text-[10px] uppercase transition-all hover:bg-white hover:text-black flex items-center gap-4 active:scale-95"
            >
              Main Access <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => { setRefreshing(true); fetchMatches().finally(() => setRefreshing(false)); }}
              className="px-14 py-5 glass border-primary/20 text-primary font-black tracking-[0.3em] text-[10px] uppercase transition-all hover:bg-primary/10 flex items-center gap-4 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Sync Data
            </button>
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: ACTIVE QUEUE (4 units) */}
        <div className="lg:col-span-4 space-y-8 text-white">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl p-8 relative overflow-hidden group"
          >
            <div className="absolute inset-0 noise pointer-events-none" />
            <h3 className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,45,45,0.8)]" />
              Active Queue
            </h3>

            <div className="space-y-3">
              {queue.length > 0 ? (
                queue.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-xl group-hover:border-white/10 transition-all hover:translate-x-1 relative z-10">
                    <img
                      src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full bg-zinc-900 ring-2 ring-white/10 p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate uppercase tracking-tight italic">{agent.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Status: Ready</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-100 font-mono text-xs uppercase tracking-[0.1em] border border-dashed border-white/20 rounded-lg bg-white/5">
                  <span className="font-bold">Queue is empty</span>
                  <span className="text-zinc-400 mt-2">Waiting for Lanys...</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: LIVE NOW (8 units) */}
        <div className="lg:col-span-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl p-8 relative overflow-hidden group h-full"
          >
            <div className="absolute inset-0 noise pointer-events-none" />
            <h3 className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(255,45,45,1)]" />
              Live Engagements
            </h3>

            <div className="space-y-4">
              {liveMatches.length > 0 ? (
                liveMatches.map((match) => (
                  <Link key={match.id} to={`/arena/${match.id}`} className="block group/item">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-6 bg-black/40 border border-white/5 group-hover/item:border-[#E84142]/30 transition-all relative overflow-hidden text-white"
                    >
                      <div className="absolute left-0 top-0 w-1 h-full bg-[#E84142] opacity-20" />

                      <div className="flex items-center gap-12 w-full justify-center py-2">
                        {/* P1 */}
                        <div className="flex items-center gap-5 text-right flex-1 justify-end">
                          <div>
                            <h4 className="font-black text-white text-xl tracking-tighter italic uppercase">{match.player_1?.name}</h4>
                            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-0.5">Origin: Protocol</p>
                          </div>
                          <img
                            src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name || 'p1'}`}
                            alt=""
                            className="w-14 h-14 rounded-full bg-zinc-900 ring-1 ring-white/10 p-0.5"
                          />
                        </div>

                        <div className="text-[#E84142] font-black italic text-xl px-4 opacity-40 tracking-tighter">VS</div>

                        {/* P2 */}
                        <div className="flex items-center gap-5 flex-1 text-left">
                          <img
                            src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name || 'p2'}`}
                            alt=""
                            className="w-14 h-14 rounded-full bg-zinc-900 ring-1 ring-white/10 p-0.5"
                          />
                          <div>
                            <h4 className="font-black text-white text-xl tracking-tighter italic uppercase">{match.player_2?.name}</h4>
                            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-0.5">Origin: Protocol</p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-xs font-mono text-[#E84142] uppercase tracking-[0.1em] opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Swords className="w-3.5 h-3.5" /> Broadcast Live
                      </div>
                    </motion.div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/20 rounded-lg bg-white/5 h-full">
                  <div className="font-mono text-xs text-zinc-200 uppercase tracking-[0.2em] text-center">
                    <span className="block font-bold">Offline</span>
                    <span className="block text-zinc-500 mt-2 italic">Waiting for combat broadcast...</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ─── RECENT HISTORY (12 units - Full Width) ─── */}
        <div className="lg:col-span-12 space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/[0.02] border border-white/10 rounded-lg p-8 backdrop-blur-sm transition-colors group"
          >
            <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-[0.2em] mb-10 flex items-center gap-3">
              <History className="w-4 h-4 text-zinc-400" />
              Recent History
            </h3>

            <div className="divide-y divide-white/5">
              {recentMatches.length > 0 ? (
                recentMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-6 transition-all hover:bg-white/[0.02] px-4 -mx-4 cursor-pointer group/row border-b border-white/5 last:border-0"
                      onClick={() => navigate(`/arena/${match.id}`)}
                    >
                      {/* Meta info (Date, Status, ID) */}
                      <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-start gap-4 sm:gap-8 sm:flex-1">
                        <div className="font-mono text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest min-w-[70px]">
                          {new Date(match.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>

                        <div className="flex items-center gap-3">
                          {match.tx_hash && !match.tx_hash.startsWith('{') && (
                            <div className="flex items-center gap-2 px-2 py-0.5 sm:py-1 bg-[#00FF00]/10 border border-[#00FF00]/20 rounded">
                              <div className="w-1 h-1 rounded-full bg-[#00FF00]" />
                              <span className="text-[9px] sm:text-[10px] font-mono text-[#00FF00] uppercase font-bold tracking-[0.1em]">Secured</span>
                            </div>
                          )}
                          <span className="font-mono text-[10px] sm:text-xs text-zinc-600 uppercase tracking-[0.1em]">#{match.id.substring(0, 8)}</span>
                        </div>
                      </div>

                      {/* Opponents */}
                      <div className="flex items-center justify-center flex-1 sm:flex-[2] gap-4 sm:gap-10 py-2 sm:py-0">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
                          <span className={`text-sm sm:text-lg font-bold tracking-tighter uppercase italic truncate text-right ${match.winner_id === match.player_1_id ? 'text-white' : 'text-zinc-500'}`}>
                            {match.player_1?.name}
                          </span>
                          <img src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full opacity-60" />
                        </div>

                        <span className="text-xs sm:text-base font-mono text-zinc-800 font-black italic px-2">VS</span>

                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <img src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full opacity-60" />
                          <span className={`text-sm sm:text-lg font-bold tracking-tighter uppercase italic truncate ${match.winner_id === match.player_2_id ? 'text-white' : 'text-zinc-500'}`}>
                            {match.player_2?.name}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="sm:w-32 flex justify-center sm:justify-end mt-2 sm:mt-0">
                        {match.tx_hash && !match.tx_hash.startsWith('{') ? (
                          <a
                            href={`https://testnet.snowtrace.io/tx/${match.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] sm:text-xs font-mono text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.1em] border-b border-white/10 hover:border-white/30"
                          >
                            Verify Record
                          </a>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-600 uppercase italic">Pending...</span>
                        )}
                      </div>
                    </div>
                ))
              ) : (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-lg bg-black/20">
                  <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-[0.3em]">No historical combat records indexed.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
