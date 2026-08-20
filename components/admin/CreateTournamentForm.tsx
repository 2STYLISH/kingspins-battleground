'use client';

import { useState } from 'react';
import { createTournament, generateBracket } from '@/lib/actions/tournaments';



const inputCls = 'w-full bg-surface-950/80 border border-surface-600 rounded-lg px-4 py-3 text-silver-100 font-mono focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-inner';
const labelCls = 'block text-[10px] text-silver-500 uppercase font-mono tracking-widest font-bold mb-2';

export default function CreateTournamentForm() {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'PLAYOFFS'>('SINGLE_ELIM');
  const [numTeams, setNumTeams] = useState(8);
  const [matchFormat, setMatchFormat] = useState<'BO1' | 'BO3' | 'BO5' | 'BO7'>('BO3');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      const id = await createTournament({ name, format, numTeams, matchFormat, startDate, endDate });
      await generateBracket(id, numTeams);
      setCreated(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative p-8 rounded-2xl border border-surface-700/50 bg-gradient-to-b from-surface-900/80 to-surface-950/80 backdrop-blur-xl shadow-2xl max-w-lg space-y-6">
      <div>
        <label className={labelCls}>Tournament Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VANTA S1 PLAYOFFS"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as any)} className={inputCls}>
            <option value="SINGLE_ELIM">Single Elimination</option>
            <option value="DOUBLE_ELIM">Double Elimination</option>
            <option value="PLAYOFFS">Playoffs (10-Team)</option>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="SWISS">Swiss</option>
            <option value="FREE_FOR_ALL">Free For All</option>
            <option value="LEADERBOARD">Leaderboard</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Number of Teams</label>
          <input 
            type="number" 
            min="2"
            max="32"
            value={numTeams} 
            onChange={(e) => setNumTeams(Number(e.target.value))} 
            className={inputCls} 
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Match Format (Default Series Format)</label>
        <select value={matchFormat} onChange={(e) => setMatchFormat(e.target.value as any)} className={inputCls}>
          <option value="BO1">Best of 1</option>
          <option value="BO3">Best of 3</option>
          <option value="BO5">Best of 5</option>
          <option value="BO7">Best of 7</option>
          <option value="TWICE_TO_BEAT">Twice-to-Beat</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!name || saving}
          className="btn-primary"
        >
          {saving ? 'CREATING…' : 'CREATE TOURNAMENT'}
        </button>
      </div>

      {created && (
        <div className="bg-surface-700 border border-surface-600 rounded-lg px-4 py-3">
          <p className="text-silver-300 text-sm">
            ✓ Tournament + empty bracket created. Head to{' '}
            <a href="/admin/bracket" className="text-white underline hover:no-underline">
              Bracket Management
            </a>{' '}
            to seed teams.
          </p>
        </div>
      )}
    </div>
  );
}
