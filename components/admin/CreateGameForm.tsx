'use client';

import { useState } from 'react';
import { createScheduledGame } from '@/lib/actions/schedule';

export default function CreateGameForm({
  tournaments,
  rosterMap,
}: {
  tournaments: { id: string; name: string }[];
  rosterMap: Record<string, { id: string; name: string }[]>;
}) {
  const [tournamentId, setTournamentId] = useState('');
  const [gameType, setGameType] = useState<'REGULAR' | 'PLAYOFF' | 'TOURNAMENT' | 'EXHIBITION'>('REGULAR');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [roundLabel, setRoundLabel] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Teams available for this tournament
  const availableTeams = tournamentId ? (rosterMap[tournamentId] ?? []) : [];

  function handleTournamentChange(id: string) {
    setTournamentId(id);
    setHome('');
    setAway('');
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await createScheduledGame({
        homeTeamId: home,
        awayTeamId: away,
        gameType,
        roundLabel: roundLabel || undefined,
        tournamentId: tournamentId || undefined,
        scheduledDate: date,
        scheduledTime: time,
      });
      setSaved(true);
      setHome('');
      setAway('');
      setRoundLabel('');
    } finally {
      setSaving(false);
    }
  }

  const selectCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 focus:border-silver-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const inputCls  = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 focus:border-silver-400 transition-colors';

  return (
    <div className="card p-6 max-w-xl space-y-4">
      <h2 className="text-lg text-white font-display tracking-widest">CREATE GAME</h2>

      {/* Step 1 — Tournament & Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">Tournament</label>
          <select value={tournamentId} onChange={(e) => handleTournamentChange(e.target.value)} className={selectCls}>
            <option value="">— none —</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">Game Type</label>
          <select value={gameType} onChange={(e) => setGameType(e.target.value as any)} className={selectCls}>
            <option value="REGULAR">Regular Season</option>
            <option value="PLAYOFF">Playoff</option>
            <option value="TOURNAMENT">Tournament</option>
            <option value="EXHIBITION">Exhibition</option>
          </select>
        </div>
      </div>

      {/* Step 2 — Teams (filtered to tournament roster) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">
            Home Team
            {tournamentId && availableTeams.length === 0 && (
              <span className="ml-2 text-crimson-400 normal-case">No teams registered</span>
            )}
          </label>
          <select
            value={home}
            onChange={(e) => setHome(e.target.value)}
            disabled={tournamentId !== '' && availableTeams.length === 0}
            className={selectCls}
          >
            <option value="">— select —</option>
            {availableTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">Away Team</label>
          <select
            value={away}
            onChange={(e) => setAway(e.target.value)}
            disabled={tournamentId !== '' && availableTeams.length === 0}
            className={selectCls}
          >
            <option value="">— select —</option>
            {availableTeams
              .filter((t) => t.id !== home) // can't play yourself
              .map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Step 3 — Details */}
      <div>
        <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">Round Label</label>
        <input value={roundLabel} onChange={(e) => setRoundLabel(e.target.value)} placeholder="e.g. Semifinal" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!home || !away || !date || !time || saving}
          className="btn-primary"
        >
          {saving ? 'CREATING…' : 'CREATE GAME'}
        </button>
        {saved && <p className="text-silver-400 text-sm font-mono">✓ Game scheduled.</p>}
      </div>
    </div>
  );
}
