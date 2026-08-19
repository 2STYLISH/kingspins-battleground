'use client';

import { useState } from 'react';
import Link from '@/components/HiddenLink';
import { formatDate } from '@/lib/format';

export default function MatchesFilter({ rounds, isUpcoming = false }: { rounds: { roundName: string; games: any[] }[], isUpcoming?: boolean }) {
  if (rounds.length === 0) {
    return (
      <div className="border border-surface-700 bg-[#080808]/90 backdrop-blur-sm p-4 rounded shadow-lg">
        <p className="text-silver-600 text-sm font-mono uppercase tracking-widest">{isUpcoming ? 'Nothing scheduled.' : 'No results yet.'}</p>
      </div>
    );
  }

  // Sort rounds logically
  const getRoundWeight = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('ROUND 1') || n.includes('PLAY-IN')) return 1;
    if (n.includes('ROUND 2')) return 2;
    if (n.includes('ROUND 3')) return 3;
    if (n.includes('ROUND 4')) return 4;
    if (n.includes('ROUND 5')) return 5;
    if (n.includes('QUARTER')) return 6;
    if (n.includes('SEMI')) return 7;
    if (n.includes('FINAL')) return 8;
    return 99; // OTHER
  };

  const sortedRounds = [...rounds].sort((a, b) => {
    const weightA = getRoundWeight(a.roundName);
    const weightB = getRoundWeight(b.roundName);
    if (weightA !== weightB) return weightA - weightB;
    // Fallback to alphabetical if same weight (e.g. FINALS GAME 1 vs FINALS GAME 2)
    return a.roundName.localeCompare(b.roundName);
  });

  const [activeRound, setActiveRound] = useState(sortedRounds[0]?.roundName);

  const activeGames = sortedRounds.find(r => r.roundName === activeRound)?.games || [];

  return (
    <div className="border border-surface-700 bg-[#080808]/90 backdrop-blur-sm p-4 rounded shadow-lg">
      <div className="flex flex-wrap gap-2 mb-4 border-b border-surface-700 pb-3">
        {sortedRounds.map(r => (
          <button
            key={r.roundName}
            onClick={() => setActiveRound(r.roundName)}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${
              activeRound === r.roundName 
                ? 'bg-red-600 text-white' 
                : 'bg-surface-800 text-silver-400 hover:bg-surface-700'
            }`}
          >
            {r.roundName}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {activeGames.length === 0 && (
          <p className="text-silver-600 text-sm font-mono uppercase tracking-widest">No games found.</p>
        )}
        {activeGames.map((g: any) => {
          const gameId = g.games?.[0]?.id;
          
          if (isUpcoming) {
            return (
              <p key={g.id} className="text-sm font-mono text-white p-2">
                {g.home?.name} <span className="text-silver-600 mx-1">VS</span> {g.away?.name}
                {g.scheduled_date && <span className="text-[#b8860b] ml-2">— {formatDate(g.scheduled_date)}</span>}
              </p>
            );
          }

          return gameId ? (
            <Link key={g.id} href={`/games/${gameId}`} className="block text-sm font-mono text-silver-300 hover:text-red-600 hover:underline transition-colors p-2 rounded hover:bg-surface-800/50">
              {g.home?.name} <span className="text-silver-600 mx-1">VS</span> {g.away?.name}
            </Link>
          ) : (
            <p key={g.id} className="text-sm font-mono text-silver-300 p-2">{g.home?.name} <span className="text-silver-600 mx-1">VS</span> {g.away?.name}</p>
          );
        })}
      </div>
    </div>
  );
}
