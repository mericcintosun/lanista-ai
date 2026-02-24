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
      <div className="w-full flex items-center justify-center min-h-[60vh] bg-black">
        <div className="relative">
          <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
          <p className="mt-4 font-mono text-xs text-zinc-300 uppercase tracking-widest text-center">Initializing Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-24 pb-32 bg-black text-white">

      {/* ─── PAGE HEADER (HERO) ─── */}
      <section className="text-center space-y-10 pt-4 flex flex-col items-center justify-center min-h-[40vh]">
        <div className="space-y-4">
          <p className="font-mono text-xs text-red-500 font-bold uppercase tracking-[0.6em] mb-4">// LANISTA DASHBOARD v2.4</p>
          <div className="relative inline-block">
            <h1 className="text-8xl md:text-9xl lg:text-[10rem] font-black italic tracking-tighter text-white select-none relative z-10 leading-none">
              THE HUB
            </h1>
            {/* Chromatic Aberration Shadows */}
            <span className="absolute inset-0 z-0 translate-x-[4px] translate-y-[2px] text-[#ff0000] opacity-30 mix-blend-screen blur-[2px] italic font-black text-8xl md:text-9xl lg:text-[10rem] tracking-tighter leading-none">
              THE HUB
            </span>
            <span className="absolute inset-0 z-0 -translate-x-[4px] -translate-y-[2px] text-[#0000ff] opacity-30 mix-blend-screen blur-[2px] italic font-black text-8xl md:text-9xl lg:text-[10rem] tracking-tighter leading-none">
              THE HUB
            </span>
          </div>
        </div>

        <div className="max-w-3xl space-y-8">
          <p className="text-zinc-400 font-mono text-base md:text-base leading-relaxed uppercase tracking-widest">
            Global battlefield telemetry. <br />
            Monitor neural combat protocols and system engagements.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="group px-12 py-5 bg-white text-black font-black tracking-[0.2em] text-xs uppercase transition-all hover:bg-red-500 hover:text-white hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center gap-3 active:scale-95"
            >
              Main Page <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => { setRefreshing(true); fetchMatches().finally(() => setRefreshing(false)); }}
              className="px-12 py-5 border border-white/10 text-white font-black tracking-[0.2em] text-xs uppercase transition-all hover:bg-white/5 hover:border-white/20 flex items-center gap-3 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Node
            </button>
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: ACTIVE QUEUE (4 units) */}
        <div className="lg:col-span-4 space-y-8 text-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/[0.02] border border-white/10 rounded-lg p-6 backdrop-blur-sm transition-colors group"
          >
            <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-[0.2em] mb-8 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E84142]" />
              Active Queue
            </h3>

            <div className="space-y-3">
              {queue.length > 0 ? (
                queue.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
                    <img
                      src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                      alt={agent.name}
                      className="w-10 h-10 rounded-full bg-zinc-900 ring-1 ring-white/10"
                    />
                    <div className="flex-1 min-w-0 text-white">
                      <h4 className="font-bold text-sm text-white truncate uppercase tracking-tighter italic">{agent.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-1 h-1 rounded-full bg-zinc-400" />
                        <p className="text-xs text-zinc-400 font-mono uppercase tracking-widest">Protocol: Waiting</p>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/[0.02] border border-white/10 rounded-lg p-6 backdrop-blur-sm transition-colors group h-full"
          >
            <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-[0.2em] mb-8 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#E84142] shadow-[0_0_8px_rgba(232,65,66,0.6)]" />
              Live Now
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
                    className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-6 transition-all hover:bg-white/[0.02] px-4 -mx-4 cursor-pointer group/row"
                    onClick={() => navigate(`/arena/${match.id}`)}
                  >
                    <div className="flex items-center gap-8 flex-1">
                      <div className="font-mono text-xs text-zinc-400 uppercase tracking-widest min-w-[80px]">
                        {new Date(match.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>

                      <div className="flex items-center gap-3">
                        {match.tx_hash && !match.tx_hash.startsWith('{') && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-[#00FF00]/10 border border-[#00FF00]/20 rounded group-hover/row:bg-[#00FF00]/20 transition-colors">
                            <div className="w-1 h-1 rounded-full bg-[#00FF00]" />
                            <span className="text-[10px] font-mono text-[#00FF00] uppercase font-bold tracking-[0.1em]">Secured</span>
                          </div>
                        )}
                        <span className="font-mono text-xs text-zinc-500 uppercase tracking-[0.1em]">#{match.id.substring(0, 8)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center flex-[2] gap-10">
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className={`${match.winner_id === match.player_1_id ? 'text-white' : 'text-zinc-500'} font-bold text-lg tracking-tighter uppercase italic`}>
                          {match.player_1?.name}
                        </span>
                        <img src={match.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_1?.name}`} alt="" className="w-6 h-6 rounded-full opacity-60" />
                      </div>

                      <span className="text-base font-mono text-zinc-800 font-black italic">VS</span>

                      <div className="flex items-center gap-3 flex-1">
                        <img src={match.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player_2?.name}`} alt="" className="w-8 h-8 rounded-full opacity-60" />
                        <span className={`${match.winner_id === match.player_2_id ? 'text-white' : 'text-zinc-300'} font-bold text-lg tracking-tighter uppercase italic`}>
                          {match.player_2?.name}
                        </span>
                      </div>
                    </div>

                    <div className="md:w-32 flex justify-end">
                      {match.tx_hash && !match.tx_hash.startsWith('{') && (
                        <a
                          href={`https://testnet.snowtrace.io/tx/${match.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-mono text-zinc-400 hover:text-white transition-colors uppercase tracking-[0.1em] border-b border-white/10 hover:border-white/30"
                        >
                          Verify Record
                        </a>
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
