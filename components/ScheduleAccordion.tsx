'use client';

import { useState } from 'react';
import Link from '@/components/HiddenLink';

export default function ScheduleAccordion({ 
  tournamentName, 
  games, 
  defaultExpanded = false 
}: { 
  tournamentName: string;
  games: any[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Group games by date inside this tournament
  const groupedByDate = new Map<string, any[]>();
  games.forEach(g => {
    const list = groupedByDate.get(g.scheduled_date) ?? [];
    list.push(g);
    groupedByDate.set(g.scheduled_date, list);
  });

  return (
    <div className="border border-surface-700 bg-surface-950 rounded overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-surface-900 hover:bg-surface-800 transition-colors text-left"
      >
        <h2 className="text-xl font-display text-white uppercase tracking-widest">{tournamentName}</h2>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono bg-surface-950 border border-surface-700 text-silver-400 px-2 py-1 rounded">
            {games.length} {games.length === 1 ? 'GAME' : 'GAMES'}
          </span>
          <span className={`text-silver-500 font-mono text-sm transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 md:p-6 space-y-6 border-t border-surface-700">
          {[...groupedByDate.entries()].map(([date, list]) => (
            <div key={date}>
              <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-3 border-b border-surface-700 pb-1">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((g: any) => {
                  const displayTime = g.scheduled_time 
                    ? new Date(`1970-01-01T${g.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                    : '';
                  const gameId = g.games?.[0]?.id;
                  const isComplete = g.status === 'COMPLETED' && gameId;

                  const CardContent = (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[10px] text-silver-500 font-mono uppercase tracking-widest">{displayTime}</p>
                        <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${
                          g.status === 'COMPLETED' ? 'bg-surface-800 text-silver-500 border border-surface-700' :
                          g.status === 'IN_PROGRESS' ? 'bg-gold text-black' :
                          'bg-surface-800 text-silver-300 border border-surface-700'
                        }`}>
                          {g.status === 'IN_PROGRESS' ? 'LIVE' : g.status === 'SCHEDULED' ? 'UPCOMING' : g.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <p className="text-white font-display tracking-wider uppercase truncate flex-1">{g.home?.name ?? 'TBD'}</p>
                        <span className="text-silver-600 font-mono text-[9px] mx-2">VS</span>
                        <p className="text-white font-display tracking-wider uppercase truncate flex-1 text-right">{g.away?.name ?? 'TBD'}</p>
                      </div>
                      {g.round_label && <p className="text-[9px] text-crimson-400 mt-3 uppercase font-mono tracking-widest">{g.round_label}</p>}
                    </>
                  );

                  return isComplete ? (
                    <Link key={g.id} href={`/games/${gameId}`} className="block p-4 border border-surface-700 bg-surface-900 hover:border-gold/60 transition-colors rounded">
                      {CardContent}
                    </Link>
                  ) : (
                    <div key={g.id} className="block p-4 border border-surface-700 bg-surface-900 rounded">
                      {CardContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
