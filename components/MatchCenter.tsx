'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function formatDateHuman(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'TODAY';
  if (days === 1) return '1D AGO';
  return `${days}D AGO`;
}

export default function MatchCenter({ games = [] }: { games: any[] }) {
  const [page, setPage] = useState(0);
  const router = useRouter();

  // 4 games per page (1 featured + 3 list)
  const itemsPerPage = 4;
  const totalPages = Math.ceil(games.length / itemsPerPage);

  const startIndex = page * itemsPerPage;
  const currentGames = games.slice(startIndex, startIndex + itemsPerPage);

  if (currentGames.length === 0) {
    return (
      <div className="card p-5 border-surface-700 bg-surface-900">
        <p className="text-silver-500 font-mono text-sm uppercase">No matches found.</p>
      </div>
    );
  }

  const featured = currentGames[0];
  const gridGames = currentGames.slice(1, 4);

  const fHome = featured.home?.name || 'TBD';
  const fAway = featured.away?.name || 'TBD';
  const fHomeLogo = featured.home?.logo_url;
  const fAwayLogo = featured.away?.logo_url;
  const fHomeScore = featured.home_score ?? 0;
  const fAwayScore = featured.away_score ?? 0;
  const fHomeWin = fHomeScore > fAwayScore;
  const fAwayWin = fAwayScore > fHomeScore;
  const fTournament = featured.schedule?.tournament?.name || 'PRO-AM LEAGUE';

  return (
    <div className="w-full bg-gradient-to-br from-surface-950/90 to-black/90 backdrop-blur-xl border border-surface-700/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-700/50">
        <div>
          <h2 className="text-2xl font-display text-white uppercase tracking-wider">MATCH CENTER</h2>
          <p className="text-[9px] text-silver-600 font-mono uppercase tracking-widest">RECENT FINALS, BOX SCORES</p>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-silver-500 font-mono bg-surface-800 px-2 py-1 rounded">
            {page + 1}/{totalPages || 1}
          </span>
          <div className="flex">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-silver-400 border border-surface-700 rounded-l hover:bg-surface-800 hover:text-white transition-colors disabled:opacity-30"
            >
              &lt; BACK
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white border border-surface-700 border-l-0 rounded-r hover:bg-surface-800 transition-colors disabled:opacity-30"
            >
              FORWARD &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 p-6 flex flex-col justify-center gap-8 min-h-[260px] bg-transparent relative border-b lg:border-b-0 lg:border-r border-surface-700/50 group/featured overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/5 rounded-full blur-[60px] pointer-events-none group-hover/featured:bg-red-600/10 transition-colors duration-500"></div>

          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-600/20 text-red-500 px-3 py-1 rounded-full border border-red-500/30 font-mono uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(220,38,38,0.2)]">FINAL</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white font-mono uppercase tracking-[0.2em] block drop-shadow-sm">{fTournament}</span>
              <span className="text-[9px] text-silver-500 font-mono uppercase tracking-widest block mt-0.5">{formatDateHuman(featured.schedule?.scheduled_date)}</span>
            </div>
          </div>

          {/* Featured Score block */}
          <div className="flex items-center justify-between mb-8 flex-col md:flex-row gap-4 relative z-10 w-full">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 text-center sm:text-left min-w-0">
              {fHomeLogo ? (
                <img src={fHomeLogo} className="w-12 h-12 lg:w-16 lg:h-16 object-cover rounded-full border-2 border-surface-700 bg-surface-900 shadow-lg shrink-0" />
              ) : (
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-surface-900 border-2 border-surface-700 shadow-lg shrink-0"></div>
              )}
              <span className="text-xl lg:text-2xl font-display text-white tracking-widest drop-shadow-md leading-tight break-words min-w-0">{fHome}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-4 shrink-0">
              <div className={`text-3xl lg:text-5xl font-mono px-3 py-2 lg:px-4 lg:py-2 rounded-xl border-2 shadow-xl ${fHomeWin ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-surface-950/80 text-silver-300 border-surface-700/50 backdrop-blur-sm'}`}>
                {fHomeScore}
              </div>
              <span className="text-xs text-silver-600 font-mono uppercase tracking-widest font-bold hidden sm:inline-block">VS</span>
              <div className={`text-3xl lg:text-5xl font-mono px-3 py-2 lg:px-4 lg:py-2 rounded-xl border-2 shadow-xl ${fAwayWin ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-surface-950/80 text-silver-300 border-surface-700/50 backdrop-blur-sm'}`}>
                {fAwayScore}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 justify-end text-center sm:text-right min-w-0">
              <span className="text-xl lg:text-2xl font-display text-white tracking-widest drop-shadow-md leading-tight break-words min-w-0 order-2 sm:order-1">{fAway}</span>
              {fAwayLogo ? (
                <img src={fAwayLogo} className="w-12 h-12 lg:w-16 lg:h-16 object-cover rounded-full border-2 border-surface-700 bg-surface-900 shadow-lg shrink-0 order-1 sm:order-2" />
              ) : (
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-surface-900 border-2 border-surface-700 shadow-lg shrink-0 order-1 sm:order-2"></div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-surface-700/50 pt-4 mt-auto relative z-10">
            <span className="text-[11px] font-mono text-gold uppercase tracking-[0.2em] font-bold drop-shadow-sm">
              {fHomeWin ? `${fHome} WINS` : fAwayWin ? `${fAway} WINS` : 'TIE'}
            </span>
            <div
              onClick={() => router.push(`/games/${featured.id}`)}
              className="cursor-pointer text-[10px] font-mono text-white bg-surface-800/80 hover:bg-red-600 border border-surface-600 hover:border-red-500 px-4 py-2 rounded-full uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 shadow-lg group-hover/featured:border-surface-500"
            >
              OPEN BOX SCORE <span className="text-red-500 group-hover/featured:text-white transition-colors">&rarr;</span>
            </div>
          </div>
        </div>

        {/* Recent Matches List (Right Panel) */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col divide-y divide-surface-700/50 bg-surface-950/30 shrink-0">
          {gridGames.map(g => <GridMatch key={g.id} game={g} />)}
        </div>
      </div>
    </div>
  );
}

function GridMatch({ game }: { game: any }) {
  const router = useRouter();

  const hName = game.home?.name || 'TBD';
  const aName = game.away?.name || 'TBD';
  const hLogo = game.home?.logo_url;
  const aLogo = game.away?.logo_url;
  const hScore = game.home_score ?? 0;
  const aScore = game.away_score ?? 0;
  const hWin = hScore > aScore;
  const aWin = aScore > hScore;

  return (
    <div onClick={() => router.push(`/games/${game.id}`)} className="cursor-pointer flex-1 p-4 bg-transparent hover:bg-surface-800/40 transition-all duration-300 flex flex-col justify-center min-h-[110px] relative group block">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
      
      <div className="flex justify-between items-center mb-4">
        <span className="text-[9px] font-mono text-red-500 uppercase tracking-[0.2em] font-bold">
          FINAL <span className="text-silver-500 font-normal tracking-widest ml-1">· {formatDateHuman(game.schedule?.scheduled_date)}</span>
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hLogo ? (
              <img src={hLogo} className="w-6 h-6 rounded-full border border-surface-600 bg-surface-900 object-cover shrink-0 shadow-sm" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-600 shrink-0 shadow-sm"></div>
            )}
            <span className={`text-base font-display tracking-widest truncate ${hWin ? 'text-white' : 'text-silver-400'}`}>{hName}</span>
          </div>
          <span className={`text-sm font-mono px-2.5 py-1 rounded shadow-sm shrink-0 ${hWin ? 'bg-white text-black font-bold' : 'bg-surface-900 text-silver-300 border border-surface-700'}`}>{hScore}</span>
        </div>

        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {aLogo ? (
              <img src={aLogo} className="w-6 h-6 rounded-full border border-surface-600 bg-surface-900 object-cover shrink-0 shadow-sm" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-600 shrink-0 shadow-sm"></div>
            )}
            <span className={`text-base font-display tracking-widest truncate ${aWin ? 'text-white' : 'text-silver-400'}`}>{aName}</span>
          </div>
          <span className={`text-sm font-mono px-2.5 py-1 rounded shadow-sm shrink-0 ${aWin ? 'bg-white text-black font-bold' : 'bg-surface-900 text-silver-300 border border-surface-700'}`}>{aScore}</span>
        </div>
      </div>
    </div>
  );
}
