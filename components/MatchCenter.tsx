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
    <div className="w-full bg-transparent border border-surface-800 rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800 bg-transparent">
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
        {/* Featured Match (Left Panel) */}
        <div className="flex-1 p-5 flex flex-col justify-between min-h-[220px] bg-transparent relative border-b lg:border-b-0 lg:border-r border-surface-800">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gold font-mono uppercase tracking-widest">⚡ FINAL</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-silver-500 font-mono uppercase tracking-widest block">{fTournament}</span>
              <span className="text-[9px] text-silver-500 font-mono uppercase tracking-widest block">{formatDateHuman(featured.schedule?.scheduled_date)}</span>
            </div>
          </div>

          {/* Featured Score block */}
          <div className="flex items-center justify-between mb-8 flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-4 flex-1">
              {fHomeLogo ? (
                <img src={fHomeLogo} className="w-12 h-12 object-cover rounded-full border border-surface-800 bg-transparent" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-transparent border border-surface-800"></div>
              )}
              <span className="text-4xl font-display text-white tracking-wider truncate max-w-[150px]">{fHome}</span>
            </div>

            <div className="flex items-center gap-3 sm:px-4">
              <div className={`text-3xl sm:text-4xl font-mono px-3 py-1.5 rounded border ${fHomeWin ? 'bg-white text-black border-transparent' : 'bg-black text-white border-surface-700'}`}>
                {fHomeScore}
              </div>
              <span className="text-[10px] text-silver-600 font-mono uppercase">VS</span>
              <div className={`text-3xl sm:text-4xl font-mono px-3 py-1.5 rounded border ${fAwayWin ? 'bg-white text-black border-transparent' : 'bg-black text-white border-surface-700'}`}>
                {fAwayScore}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end">
              <span className="text-4xl font-display text-white tracking-wider truncate max-w-[150px]">{fAway}</span>
              {fAwayLogo ? (
                <img src={fAwayLogo} className="w-12 h-12 object-cover rounded-full border border-surface-800 bg-transparent" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-transparent border border-surface-800"></div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-surface-800 pt-4 mt-auto">
            <span className="text-[10px] font-mono text-silver-400 uppercase tracking-widest">
              {fHomeWin ? `${fHome} WINS` : fAwayWin ? `${fAway} WINS` : 'TIE'}
            </span>
            <div
              onClick={() => router.push(`/games/${featured.id}`)}
              className="cursor-pointer text-[10px] font-mono text-white hover:text-silver-300 uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              OPEN BOX SCORE &rarr;
            </div>
          </div>
        </div>

        {/* Recent Matches List (Right Panel) */}
        <div className="w-full lg:w-[320px] xl:w-[360px] flex flex-col divide-y divide-surface-800 bg-transparent shrink-0">
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
    <div onClick={() => router.push(`/games/${game.id}`)} className="cursor-pointer flex-1 p-3 bg-transparent hover:bg-surface-800/20 transition-colors flex flex-col justify-center min-h-[100px] relative group block">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[9px] font-mono text-silver-600 uppercase tracking-widest">
          FINAL · {formatDateHuman(game.schedule?.scheduled_date)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hLogo ? (
              <img src={hLogo} className="w-5 h-5 rounded-full border border-surface-700 object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-surface-700 shrink-0"></div>
            )}
            <span className={`text-sm font-display tracking-widest truncate ${hWin ? 'text-white' : 'text-silver-400'}`}>{hName}</span>
          </div>
          <span className={`text-sm font-mono px-2 py-0.5 rounded border shrink-0 ${hWin ? 'bg-white text-black border-transparent' : 'bg-black text-white border-surface-700'}`}>{hScore}</span>
        </div>

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {aLogo ? (
              <img src={aLogo} className="w-5 h-5 rounded-full border border-surface-700 object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-surface-700 shrink-0"></div>
            )}
            <span className={`text-sm font-display tracking-widest truncate ${aWin ? 'text-white' : 'text-silver-400'}`}>{aName}</span>
          </div>
          <span className={`text-sm font-mono px-2 py-0.5 rounded border shrink-0 ${aWin ? 'bg-white text-black border-transparent' : 'bg-black text-white border-surface-700'}`}>{aScore}</span>
        </div>
      </div>

      <div className="absolute inset-0 border border-transparent group-hover:border-surface-700 pointer-events-none transition-colors" />
    </div>
  );
}
