'use client';

import { useState } from 'react';
import { overrideBracketMatchup } from '@/lib/actions/bracket';

type Team = { id: string; name: string } | null;
type Matchup = { id: string; round: number; slot: number; status: string; team_a: Team; team_b: Team };

const selectCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors';
const labelCls = 'block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5';

export default function OverrideForm({ matchups, allTeams = [] }: { matchups: Matchup[]; allTeams?: Team[] }) {
  const [matchupId, setMatchupId] = useState('');
  const [action, setAction] = useState<'ADVANCE_TEAM' | 'CHANGE_WINNER' | 'RESET_MATCHUP' | 'ASSIGN_TEAMS'>('ADVANCE_TEAM');
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [assignTeamA, setAssignTeamA] = useState('');
  const [assignTeamB, setAssignTeamB] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const matchup = matchups.find((m) => m.id === matchupId);

  async function handleSubmit() {
    setSaving(true);
    try {
      await overrideBracketMatchup({ 
        matchupId, 
        action: action as any, 
        winnerTeamId: winnerTeamId || undefined, 
        teamAId: assignTeamA || undefined,
        teamBId: assignTeamB || undefined,
        reason 
      });
      setDone(true);
      setReason('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 max-w-lg space-y-4">
      <div>
        <label className={labelCls}>Matchup</label>
        <select value={matchupId} onChange={(e) => setMatchupId(e.target.value)} className={selectCls}>
          <option value="">— select —</option>
          {matchups.map((m) => (
            <option key={m.id} value={m.id}>
              R{m.round}·{m.slot}: {m.team_a?.name ?? 'TBD'} vs {m.team_b?.name ?? 'TBD'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Action</label>
        <select value={action} onChange={(e) => setAction(e.target.value as any)} className={selectCls}>
          <option value="ADVANCE_TEAM">Advance a team</option>
          <option value="CHANGE_WINNER">Change series winner</option>
          <option value="ASSIGN_TEAMS">Manually assign teams (Seeding)</option>
          <option value="RESET_MATCHUP">Reset matchup</option>
        </select>
      </div>

      {(action === 'ADVANCE_TEAM' || action === 'CHANGE_WINNER') && matchup && (
        <div>
          <label className={labelCls}>Winning Team</label>
          <select value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)} className={selectCls}>
            <option value="">— select —</option>
            {matchup.team_a && <option value={matchup.team_a.id}>{matchup.team_a.name}</option>}
            {matchup.team_b && <option value={matchup.team_b.id}>{matchup.team_b.name}</option>}
          </select>
        </div>
      )}

      {action === 'ASSIGN_TEAMS' && matchup && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Slot 1 (Top)</label>
            <select value={assignTeamA} onChange={(e) => setAssignTeamA(e.target.value)} className={selectCls}>
              <option value="">— select team —</option>
              {allTeams.map((t) => (
                <option key={t?.id} value={t?.id}>{t?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Slot 2 (Bottom)</label>
            <select value={assignTeamB} onChange={(e) => setAssignTeamB(e.target.value)} className={selectCls}>
              <option value="">— select team —</option>
              {allTeams.map((t) => (
                <option key={t?.id} value={t?.id}>{t?.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Reason (required)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 placeholder-silver-700 focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors resize-none"
          placeholder="e.g. Opponent forfeited"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={!matchupId || !reason.trim() || saving}
          className="btn-danger"
        >
          {saving ? 'APPLYING…' : 'APPLY OVERRIDE'}
        </button>
        {done && <p className="text-silver-400 text-sm font-mono">✓ Override applied and logged.</p>}
      </div>
    </div>
  );
}
