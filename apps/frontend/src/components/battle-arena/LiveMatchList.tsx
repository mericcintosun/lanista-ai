import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { prefetchGameHtml } from '../../lib/prefetchGame';
import { Radio, Swords, ChevronLeft } from 'lucide-react';
import type { Match } from '@lanista/types';

/* Colour tokens — same system as Hub */
const C = {
  fire: { base: '#e8813c', dim: 'rgba(232,129,60,0.1)', border: 'rgba(232,129,60,0.22)' },
  sky:  { base: '#4fa3e3', dim: 'rgba(79,163,227,0.08)', border: 'rgba(79,163,227,0.2)' },
};

interface LiveMatchListProps { matches: Match[] }

export function LiveMatchList({ matches }: LiveMatchListProps) {
  return (
    <div className="w-full flex flex-col gap-8">
      {/* ── Match cards ── */}
      {matches.length > 0 ? (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {matches.map(m => (
            <Link
              key={m.id}
              to={`/game-arena/${m.id}`}
              onMouseEnter={prefetchGameHtml}
              className="group block"
            >
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="relative rounded-2xl overflow-hidden"
                style={{ background: 'rgba(18,12,8,0.85)', border: `1px solid ${C.fire.border}` }}
              >
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${C.fire.base}60, transparent)` }} />

                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-40 h-32 rounded-full blur-3xl pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${C.fire.dim} 0%, transparent 70%)` }} />

                {/* Header row */}
                <div className="flex items-center justify-between px-5 pt-5 pb-0">
                  <span className="font-mono text-xs text-white/30 uppercase tracking-widest">
                    #{m.id.substring(0, 8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: C.fire.base, boxShadow: `0 0 8px ${C.fire.base}` }} />
                      <div className="absolute inset-0 rounded-full animate-ping opacity-35"
                        style={{ background: C.fire.base }} />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: C.fire.base }}>
                      Live Now
                    </span>
                    <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: C.fire.base }} />
                  </div>
                </div>

                {/* VS row */}
                <div className="flex items-center gap-4 px-5 py-5">
                  {/* P1 */}
                  <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                    <div className="text-right min-w-0">
                      <h4 className="font-black text-base sm:text-lg text-white uppercase italic tracking-tight truncate group-hover:text-[#e8813c] transition-colors">
                        {m.player_1?.name}
                      </h4>
                      <p className="font-mono text-xs text-white/35 uppercase tracking-widest mt-0.5">
                        Corner 1
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      <img
                        src={m.player_1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.player_1?.name ?? 'P1'}`}
                        alt={m.player_1?.name ?? 'Player 1'}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#120c08]"
                        style={{ background: C.fire.base, boxShadow: `0 0 6px ${C.fire.base}` }} />
                    </div>
                  </div>

                  {/* VS divider */}
                  <div className="flex flex-col items-center shrink-0 gap-1">
                    <div className="w-px h-4 opacity-30" style={{ background: C.fire.base }} />
                    <span className="font-black italic text-sm" style={{ color: C.fire.base, opacity: 0.55 }}>VS</span>
                    <div className="w-px h-4 opacity-30" style={{ background: C.fire.base }} />
                  </div>

                  {/* P2 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={m.player_2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.player_2?.name ?? 'P2'}`}
                        alt={m.player_2?.name ?? 'Player 2'}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#120c08]"
                        style={{ background: C.fire.base, boxShadow: `0 0 6px ${C.fire.base}` }} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-base sm:text-lg text-white uppercase italic tracking-tight truncate group-hover:text-[#e8813c] transition-colors">
                        {m.player_2?.name}
                      </h4>
                      <p className="font-mono text-xs text-white/35 uppercase tracking-widest mt-0.5">
                        Corner 2
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hover CTA */}
                <div className="flex items-center justify-center px-5 pb-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest"
                    style={{ color: C.fire.base }}>
                    <Swords className="w-3.5 h-3.5" />
                    Enter Arena →
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      ) : (
        /* ── Empty state ── */
        <div
          className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden"
          style={{ background: 'rgba(18,12,8,0.7)', border: `1px solid ${C.fire.border}` }}
        >
          {/* Scan-line animation */}
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
            className="absolute left-0 right-0 h-24 pointer-events-none z-0 opacity-[0.03]"
            style={{ background: 'linear-gradient(to bottom, transparent, white, transparent)' }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center py-20 px-8 text-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: C.fire.dim, border: `1px solid ${C.fire.border}` }}>
                <Swords className="w-8 h-8" style={{ color: C.fire.base, opacity: 0.5 }} />
              </div>
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-30" style={{ background: C.fire.base }} />
            </div>
            <div className="space-y-2">
              <p className="font-black text-xl text-white uppercase italic tracking-tight">
                No Active Battles
              </p>
              <p className="font-mono text-sm text-white/40 uppercase tracking-widest leading-relaxed">
                Arena is offline. Waiting for gladiators.<br />
                <span className="text-white/25">Combat will broadcast automatically.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Return button ── */}
      <div className="flex justify-center">
        <Link
          to="/hub"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm font-bold uppercase tracking-widest transition-all group"
          style={{ color: C.sky.base, border: `1px solid ${C.sky.border}`, background: C.sky.dim }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(79,163,227,0.15)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(79,163,227,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = C.sky.dim;
            (e.currentTarget as HTMLAnchorElement).style.borderColor = C.sky.border;
          }}
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Return to Hub
        </Link>
      </div>
    </div>
  );
}
