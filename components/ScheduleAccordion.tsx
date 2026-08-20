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
    <div className="relative rounded-2xl overflow-hidden bg-surface-950/80 backdrop-blur-md border border-surface-700/50 shadow-2xl transition-all">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 md:p-6 bg-surface-900/40 hover:bg-surface-800/60 transition-colors text-left"
      >
        <h2 className="text-2xl font-display text-white uppercase tracking-widest drop-shadow-sm">{tournamentName}</h2>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono bg-surface-800/50 border border-surface-600 text-silver-300 px-3 py-1 rounded-full uppercase tracking-widest">
            {games.length} {games.length === 1 ? 'GAME' : 'GAMES'}
          </span>
          <span className={`text-silver-500 font-mono text-sm transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="p-5 md:p-8 space-y-8 border-t border-surface-800/80 bg-black/20">
          {[...groupedByDate.entries()].map(([date, list]) => (
            <div key={date}>
              <p className="text-xs font-mono text-gold uppercase tracking-[0.3em] mb-4 border-b border-surface-800 pb-2 font-bold">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((g: any) => {
                  const displayTime = g.scheduled_time 
                    ? new Date(`1970-01-01T${g.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                    : '';
                  const gameId = g.games?.[0]?.id;
                  const isComplete = g.status === 'COMPLETED' && gameId;

                  const CardContent = (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-silver-500 font-mono uppercase tracking-[0.2em]">{displayTime}</p>
                        <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${
                          g.status === 'COMPLETED' ? 'bg-surface-900/80 text-silver-500 border-surface-700' :
                          g.status === 'IN_PROGRESS' ? 'bg-red-600/20 text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.2)]' :
                          'bg-surface-800/80 text-silver-300 border-surface-600'
                        }`}>
                          {g.status === 'IN_PROGRESS' ? 'LIVE' : g.status === 'SCHEDULED' ? 'UPCOMING' : g.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-base">
                        <p className="text-white font-display tracking-widest uppercase truncate flex-1 group-hover/card:text-red-100 transition-colors">{g.home?.name ?? 'TBD'}</p>
                        <span className="text-silver-600 font-mono text-[10px] mx-3">VS</span>
                        <p className="text-white font-display tracking-widest uppercase truncate flex-1 text-right group-hover/card:text-red-100 transition-colors">{g.away?.name ?? 'TBD'}</p>
                      </div>
                      {g.round_label && <p className="text-[10px] text-red-500 mt-4 uppercase font-mono tracking-[0.2em]">{g.round_label}</p>}
                    </>
                  );

                  return isComplete ? (
                    <Link key={g.id} href={`/games/${gameId}`} className="group/card relative block p-5 rounded-xl border border-surface-700/50 bg-[#0a0a0a]/80 backdrop-blur-sm shadow-lg hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.15)] transition-all overflow-hidden">
                      {CardContent}
                    </Link>
                  ) : (
                    <div key={g.id} className="group/card relative block p-5 rounded-xl border border-surface-700/50 bg-[#0a0a0a]/80 backdrop-blur-sm shadow-lg overflow-hidden opacity-80">
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
