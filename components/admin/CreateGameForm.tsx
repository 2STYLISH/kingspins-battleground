'use client';

import { useState } from 'react';
import { createScheduledGame } from '@/lib/actions/schedule';

export default function CreateGameForm({
  tournaments,
  rosterMap,
  matchupsMap,
  schedules,
}: {
  tournaments: { id: string; name: string }[];
  rosterMap: Record<string, { id: string; name: string }[]>;
  matchupsMap?: Record<string, any[]>;
  schedules?: any[];
}) {
  const [tournamentId, setTournamentId] = useState('');
  const [selectedMatchupId, setSelectedMatchupId] = useState('');
  const [gameType, setGameType] = useState<'REGULAR' | 'PLAYOFF' | 'TOURNAMENT' | 'EXHIBITION'>('REGULAR');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [roundLabel, setRoundLabel] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isRoundLabelEditable, setIsRoundLabelEditable] = useState(false);

  // Teams available for this tournament
  const allTeams = tournamentId ? (rosterMap[tournamentId] ?? []) : [];
  let availableTeams = allTeams;

  const activeMatchup = selectedMatchupId ? (matchupsMap?.[tournamentId] ?? []).find(m => m.id === selectedMatchupId) : null;
  if (activeMatchup) {
    availableTeams = allTeams.filter(t => t.id === activeMatchup.team_a_id || t.id === activeMatchup.team_b_id);
  }

  function handleTournamentChange(id: string) {
    setTournamentId(id);
    setSelectedMatchupId('');
    setHome('');
    setAway('');
    setIsRoundLabelEditable(false);
  }

  function handleMatchupChange(matchupId: string) {
    setSelectedMatchupId(matchupId);
    if (!matchupId) return;
    const matchup = (matchupsMap?.[tournamentId] ?? []).find(m => m.id === matchupId);
    if (matchup) {
      setHome('');
      setAway('');
      let newRoundLabel = '';
      if (matchup.bracket_side === 'GRAND_FINAL') newRoundLabel = 'Grand Final';
      else if (matchup.bracket_side === 'WINNERS') newRoundLabel = `Upper Round ${matchup.round}`;
      else if (matchup.bracket_side === 'LOSERS') newRoundLabel = `Lower Round ${matchup.round}`;
      else if (matchup.bracket_side === 'PLAY_IN') newRoundLabel = `Play-In Round ${matchup.round}`;
      else newRoundLabel = `Round ${matchup.round}`;

      const seriesId = matchup.series?.[0]?.id;
      let gameNumber = 1;
      if (seriesId && schedules) {
        gameNumber = schedules.filter(s => s.series_id === seriesId).length + 1;
      }

      setRoundLabel(`${newRoundLabel} - Game ${gameNumber}`);
      setIsRoundLabelEditable(false);
      setGameType('PLAYOFF');
    }
  }

  function handleSwapTeams() {
    const temp = home;
    setHome(away);
    setAway(temp);
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
      setSelectedMatchupId('');
    } finally {
      setSaving(false);
    }
  }

  const selectCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 focus:border-silver-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const inputCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 focus:border-silver-400 transition-colors';

  return (
    <div className="card p-6 max-w-xl space-y-4">
      <h2 className="text-lg text-white font-display tracking-widest">CREATE GAME</h2>

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

      {tournamentId && (matchupsMap?.[tournamentId]?.length ?? 0) > 0 && (
        <div className="bg-surface-800/50 p-3 rounded-lg border border-surface-700">
          <select value={selectedMatchupId} onChange={(e) => handleMatchupChange(e.target.value)} className={selectCls}>
            <option value="">— select a pending matchup —</option>
            {matchupsMap![tournamentId].map((m) => (
              <option key={m.id} value={m.id}>
                {m.team_a?.name} vs {m.team_b?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 2 — Teams (filtered to tournament roster) */}
      <div className="grid grid-cols-2 gap-3 relative">
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
      <div className="flex justify-end mt-1">
        <button onClick={handleSwapTeams} disabled={!home || !away} type="button" className="text-[10px] font-mono text-silver-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors disabled:opacity-40">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          Swap Home & Away
        </button>
      </div>

      {/* Step 3 — Details */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-silver-600 uppercase font-mono tracking-widest">Round Label</label>
          <button type="button" onClick={() => setIsRoundLabelEditable(true)} className="text-[10px] text-gold uppercase font-mono tracking-widest hover:text-white transition-colors">
            Edit
          </button>
        </div>
        <input
          value={roundLabel}
          onChange={(e) => setRoundLabel(e.target.value)}
          placeholder="e.g. Semifinal - Game 1"
          className={inputCls}
          disabled={!isRoundLabelEditable}
        />
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
