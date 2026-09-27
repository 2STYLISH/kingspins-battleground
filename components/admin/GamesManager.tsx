'use client';

import { useState } from 'react';
import Link from '@/components/HiddenLink';
import { formatDate, formatTime } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'text-silver-600 bg-surface-800',
  LIVE: 'text-white bg-surface-700',
  AWAITING_STATS: 'text-silver-400 bg-surface-800',
  STATS_UNDER_REVIEW: 'text-silver-300 bg-surface-700',
  VERIFIED: 'text-white bg-surface-700',
  COMPLETED: 'text-silver-400 bg-surface-800',
};

export default function GamesManager({ schedules }: { schedules: any[] }) {
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [search, setSearch] = useState('');

  const filtered = schedules.filter((s) => {
    // If the schedule is archived, or the game is VERIFIED/COMPLETED, consider it archived
    const isArchived = s.is_archived || s.gameStatus === 'VERIFIED' || s.gameStatus === 'COMPLETED';
    
    if (tab === 'ACTIVE' && isArchived) return false;
    if (tab === 'ARCHIVED' && !isArchived) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.home?.name?.toLowerCase().includes(q) ||
      s.away?.name?.toLowerCase().includes(q) ||
      s.round_label?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <button 
            onClick={() => setTab('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${tab === 'ACTIVE' ? 'bg-[#b8860b]/20 text-[#b8860b] border border-[#b8860b]/50' : 'bg-surface-800 text-silver-500 hover:text-white border border-surface-600'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setTab('ARCHIVED')}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${tab === 'ARCHIVED' ? 'bg-[#b8860b]/20 text-[#b8860b] border border-[#b8860b]/50' : 'bg-surface-800 text-silver-500 hover:text-white border border-surface-600'}`}
          >
            Archived
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by team or round..."
          className="w-full sm:w-64 bg-surface-900 border border-surface-600 rounded-lg px-3 py-1.5 text-silver-200 placeholder-silver-700 text-sm focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors"
        />
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-silver-600 text-sm">
              {tab === 'ACTIVE' ? 'No active games waiting for screenshots.' : 'No archived games found.'}
            </p>
          </div>
        )}
        
        {filtered.map((s) => {
          const statusStyle = STATUS_STYLES[s.gameStatus] ?? 'text-silver-600';
          return (
            <Link
              key={s.id}
              href={`/admin/games/${s.id}`}
              className="relative group p-5 rounded-2xl border border-surface-700/50 bg-gradient-to-br from-surface-900/80 to-surface-950/80 backdrop-blur-xl shadow-lg hover:shadow-[0_0_25px_rgba(220,38,38,0.15)] hover:border-red-500/40 transition-all duration-300 overflow-hidden flex items-center justify-between"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-mono text-silver-500 uppercase tracking-widest group-hover:text-silver-400 transition-colors">
                  {s.game_type}
                  {s.round_label ? ` · ${s.round_label}` : ''} · {formatDate(s.scheduled_date)} {formatTime(s.scheduled_time)}
                </p>
                <p className="text-white font-display text-lg mt-1 group-hover:text-red-400 transition-colors">
                  {s.home?.name ?? 'TBD'} <span className="text-silver-600">vs</span> {s.away?.name ?? 'TBD'}
                </p>
              </div>
              <span className={`relative z-10 text-[10px] font-mono uppercase px-3 py-1 rounded-full border border-surface-600/50 shadow-sm ${statusStyle}`}>
                {s.gameStatus.replace(/_/g, ' ')}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
