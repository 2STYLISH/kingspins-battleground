'use client';

import { useState } from 'react';
import { updateSchedule, deleteSchedule } from '@/lib/actions/schedule';
import { formatDate } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:  'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50',
  LIVE:       'bg-yellow-900/40 text-yellow-300 border border-yellow-600/50 animate-pulse',
  COMPLETED:  'bg-surface-700 text-silver-500 border border-surface-600',
  POSTPONED:  'bg-orange-900/40 text-orange-400 border border-orange-700/50',
  CANCELLED:  'bg-red-900/40 text-red-400 border border-red-700/50',
};

export default function ScheduleManager({ games }: { games: any[] }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const filtered = games.filter((g) => {
    const isArchived = g.is_archived || g.status === 'COMPLETED';
    if (tab === 'ACTIVE' && isArchived) return false;
    if (tab === 'ARCHIVED' && !isArchived) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.home?.name?.toLowerCase().includes(q) ||
      g.away?.name?.toLowerCase().includes(q) ||
      g.tournament?.name?.toLowerCase().includes(q) ||
      g.round_label?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
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
          placeholder="Filter by team, tournament, or round…"
          className="w-full sm:w-64 bg-surface-900 border border-surface-600 rounded-lg px-3 py-1.5 text-silver-200 placeholder-silver-700 text-sm focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors"
        />
      </div>
      
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-silver-600 text-sm">No games found.</p>}
        {filtered.map((g) => (
          <GameRow key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}

function GameRow({ game }: { game: any }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(game.scheduled_date || '');
  const [time, setTime] = useState(game.scheduled_time?.slice(0, 5) || '');
  const [type, setType] = useState(game.game_type || 'REGULAR');
  const [roundLabel, setRoundLabel] = useState(game.round_label || '');
  const [status, setStatus] = useState(game.status || 'SCHEDULED');
  const [busy, setBusy] = useState(false);

  const displayTime = game.scheduled_time
    ? new Date(`1970-01-01T${game.scheduled_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : '';

  const tournament = game.tournament?.name;

  async function handleSave() {
    setBusy(true);
    try {
      await updateSchedule(game.id, {
        scheduledDate: date,
        scheduledTime: time,
        gameType: type as any,
        roundLabel: roundLabel || undefined,
        status: status as any,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleArchive() {
    setBusy(true);
    try {
      await updateSchedule(game.id, { isArchived: !game.is_archived });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this scheduled game?')) return;
    setBusy(true);
    try {
      await deleteSchedule(game.id);
    } catch {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="card p-4 space-y-3 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
        <div className="mb-2">
          <p className="text-bone font-medium">{game.home?.name} vs {game.away?.name}</p>
          {tournament && <p className="text-xs text-silver-500 font-mono mt-0.5">{tournament}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="block text-[10px] text-silver-500 uppercase tracking-widest mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-silver-500 uppercase tracking-widest mb-1">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-silver-500 uppercase tracking-widest mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input-field py-1.5 text-sm">
              <option value="REGULAR">Regular</option>
              <option value="PLAYOFF">Playoff</option>
              <option value="TOURNAMENT">Tournament</option>
              <option value="EXHIBITION">Exhibition</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-silver-500 uppercase tracking-widest mb-1">Round Label</label>
            <input type="text" value={roundLabel} onChange={e => setRoundLabel(e.target.value)} placeholder="e.g. Finals" className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-silver-500 uppercase tracking-widest mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field py-1.5 text-sm">
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
              <option value="POSTPONED">Postponed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-4">
            <button onClick={handleDelete} disabled={busy} className="text-xs text-crimson-400 hover:text-crimson-300 font-mono">
              DELETE
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} disabled={busy} className="btn-secondary py-1.5 text-xs">CANCEL</button>
            <button onClick={handleSave} disabled={busy} className="btn-primary py-1.5 text-xs">SAVE</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 flex items-center justify-between group">
      <div className="min-w-0">
        <p className="text-bone font-medium truncate">{game.home?.name} vs {game.away?.name}</p>
        <p className="text-xs text-mute font-mono uppercase mt-0.5">
          {tournament && <span className="text-silver-400 not-uppercase normal-case mr-2">[{tournament}]</span>}
          {formatDate(game.scheduled_date)} · {displayTime}
          {game.round_label ? ` · ${game.round_label}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${STATUS_STYLES[game.status] ?? 'text-silver-500'}`}>
          {game.status}
        </span>
        {game.status !== 'COMPLETED' && (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] font-mono text-silver-500 hover:text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 border border-surface-600 rounded"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
