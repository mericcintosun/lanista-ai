import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ExternalLink, Gamepad2 } from 'lucide-react';
import type { MatchData, BotData } from '../../types';

interface MatchHistoryProps {
  history: MatchData[];
  agent: BotData;
}

export function MatchHistory({ history, agent }: MatchHistoryProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (history.length === 0) {
    return (
      <div className="p-12 text-center border-t border-white/5">
        <p className="font-mono text-zinc-600 text-[10px] uppercase tracking-widest">No combat logs found for this agent.</p>
      </div>
    );
  }

  const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
        <span className="w-2 h-2 bg-red-500 rounded-full" />
        Combat History
      </h2>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {paginatedHistory.map((match) => {
            const isWinner = match.winner_id === agent.id;
            const isPlayer1 = match.player_1_id === agent.id;
            const opponent = isPlayer1 ? match.player_2 : match.player_1;
            const opponentId = isPlayer1 ? match.player_2_id : match.player_1_id;

            const showEloChange = match.status === 'finished' && match.winner_elo_gain !== undefined;
            const eloChange = isWinner ? match.winner_elo_gain : (match.loser_elo_loss ? -match.loser_elo_loss : 0);

            return (
              <div key={match.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors">
                {/* Result Tag */}
                <div className="sm:col-span-2 flex items-center gap-3">
                  {match.status === 'finished' ? (
                    <span className={`px-2 py-1 flex items-center justify-center font-mono text-[10px] font-bold tracking-widest rounded ${isWinner ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                      {isWinner ? 'VICTORY' : 'DEFEAT'}
                    </span>
                  ) : (
                    <span className="px-2 py-1 font-mono text-[10px] font-bold tracking-widest rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                      {match.status.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Opponent info */}
                <div className="sm:col-span-5 flex items-center gap-3 cursor-pointer group" onClick={() => navigate(`/agent/${opponentId}`)}>
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest hidden sm:block">VS</span>
                  <img
                    src={opponent?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${opponent?.name || opponentId}`}
                    className="w-8 h-8 rounded-full bg-black/50 border border-white/10 group-hover:border-white/30 transition-colors p-1"
                    alt=""
                  />
                  <div>
                    <p className="font-bold text-sm text-white group-hover:text-red-400 uppercase italic tracking-tighter">{opponent?.name || 'Unknown Agent'}</p>
                    <p className="font-mono text-[9px] text-zinc-600">{opponentId.substring(0, 8)}</p>
                  </div>
                </div>

                {/* Date & ELO Change */}
                <div className="sm:col-span-3 flex flex-col justify-center gap-1 opacity-80">
                  <div className="font-mono text-[10px] text-zinc-400 uppercase">
                    {new Date(match.created_at || '').toLocaleDateString()} {new Date(match.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {showEloChange ? (
                    <div className={`font-mono text-[10px] font-bold ${eloChange! > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {eloChange! > 0 ? '+' : ''}{eloChange} ELO
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Link
                    to={`/game-arena/${match.id}`}
                    className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
                  >
                    <Gamepad2 className="w-4 h-4" />
                  </Link>
                  {match.tx_hash && (
                    <a
                      href={`https://testnet.snowtrace.io/tx/${match.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-white/10 rounded transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {Math.ceil(history.length / itemsPerPage) > 1 && (
          <div className="border-t border-white/5 p-4 flex items-center justify-center gap-2 bg-black/20">
            {Array.from({ length: Math.ceil(history.length / itemsPerPage) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded font-mono text-xs transition-colors border ${currentPage === i + 1
                  ? 'bg-red-500/20 text-red-500 border-red-500/30'
                  : 'bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
