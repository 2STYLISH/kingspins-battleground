'use client';

import { useState, useEffect } from 'react';
import { overrideBracketMatchup } from '@/lib/actions/bracket';
import type { Matchup, Team } from '../BracketTree';

const selectCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors';
const labelCls = 'block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5';

export default function EditMatchupModal({
  matchup,
  allTeams,
  isOpen,
  onClose
}: {
  matchup: Matchup | null;
  allTeams: Team[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [action, setAction] = useState<'ADVANCE_TEAM' | 'CHANGE_WINNER' | 'RESET_MATCHUP' | 'ASSIGN_TEAMS'>('ASSIGN_TEAMS');
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [assignTeamA, setAssignTeamA] = useState('');
  const [assignTeamB, setAssignTeamB] = useState('');
  const [matchFormat, setMatchFormat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset state when a new matchup is opened
  useEffect(() => {
    if (matchup) {
      setAssignTeamA(matchup.team_a?.id ?? '');
      setAssignTeamB(matchup.team_b?.id ?? '');
      setWinnerTeamId(matchup.winner_id ?? '');
      setMatchFormat((matchup as any).match_format ?? '');
      setError('');
      
      // Smart default action
      if (!matchup.team_a || !matchup.team_b) {
        setAction('ASSIGN_TEAMS');
      } else if (matchup.status === 'COMPLETED') {
        setAction('CHANGE_WINNER');
      } else {
        setAction('ADVANCE_TEAM');
      }
    }
  }, [matchup]);

  if (!isOpen || !matchup) return null;

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      await overrideBracketMatchup({ 
        matchupId: matchup!.id, 
        action, 
        winnerTeamId: winnerTeamId || undefined, 
        teamAId: assignTeamA || undefined,
        teamBId: assignTeamB || undefined,
        matchFormat: matchFormat || undefined,
        reason: 'Admin override from UI'
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-arena-900 border border-surface-700 rounded-lg p-6 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-mute hover:text-bone">
          ✕
        </button>
        
        <h2 className="text-xl text-bone font-display mb-1">
          Edit Matchup {matchup.matchNumber ? `#${matchup.matchNumber}` : ''}
        </h2>
        <p className="text-xs font-mono text-mute mb-6">
          {matchup.bracket_side} - Round {matchup.round} Slot {matchup.slot}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-crimson/10 border border-crimson/50 rounded text-crimson-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value as any)} className={selectCls}>
              <option value="ASSIGN_TEAMS">Manually assign teams (Seeding)</option>
              <option value="ADVANCE_TEAM">Advance a team / Set Winner</option>
              <option value="CHANGE_WINNER">Change series winner</option>
              <option value="RESET_MATCHUP">Reset matchup</option>
            </select>
          </div>

          {(action === 'ADVANCE_TEAM' || action === 'CHANGE_WINNER') && (
            <div>
              <label className={labelCls}>Winning Team</label>
              <select value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)} className={selectCls}>
                <option value="">— select —</option>
                {matchup.team_a && <option value={matchup.team_a.id}>{matchup.team_a.name}</option>}
                {matchup.team_b && <option value={matchup.team_b.id}>{matchup.team_b.name}</option>}
                {!matchup.team_a && !matchup.team_b && (
                  <option disabled value="">Must assign teams first</option>
                )}
              </select>
            </div>
          )}

          {action === 'ASSIGN_TEAMS' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Slot 1 (Top)</label>
                <select value={assignTeamA} onChange={(e) => setAssignTeamA(e.target.value)} className={selectCls}>
                  <option value="">— TBD —</option>
                  {allTeams.map((t) => (
                    <option key={t?.id} value={t?.id}>{t?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Slot 2 (Bottom)</label>
                <select value={assignTeamB} onChange={(e) => setAssignTeamB(e.target.value)} className={selectCls}>
                  <option value="">— TBD —</option>
                  {allTeams.map((t) => (
                    <option key={t?.id} value={t?.id}>{t?.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Match Format (Series)</label>
            <select value={matchFormat} onChange={(e) => setMatchFormat(e.target.value as any)} className={selectCls}>
              <option value="">— Tournament Default —</option>
              <option value="BO1">Best of 1</option>
              <option value="BO3">Best of 3</option>
              <option value="BO5">Best of 5</option>
              <option value="BO7">Best of 7</option>
              <option value="TWICE_TO_BEAT">Twice-to-Beat</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 rounded border border-surface-600 text-silver-400 hover:text-bone disabled:opacity-50 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2 rounded bg-crimson text-bone font-medium hover:bg-crimson-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'SAVING...' : 'CONFIRM OVERRIDE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
