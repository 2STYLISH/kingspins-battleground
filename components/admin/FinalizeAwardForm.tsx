'use client';

import { useState } from 'react';
import { finalizeAward } from '@/lib/actions/awards';

const selectCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors';
const labelCls = 'block text-[10px] text-silver-600 uppercase font-mono tracking-widest mb-1.5';

export default function FinalizeAwardForm({
  awardType,
  awardId,
  tournamentId,
  currentWinnerId,
  candidates,
}: {
  awardType: string;
  awardId: string | null;
  tournamentId: string;
  currentWinnerId: string | null;
  currentNotes?: string;
  candidates: { id: string; gamertag: string }[];
}) {
  const [winnerId, setWinnerId] = useState(currentWinnerId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      await finalizeAward({ awardType, awardId, tournamentId, winnerPlayerId: winnerId, notes: '', publishNotes: false });
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg text-white font-display tracking-widest">FINAL ADMIN DECISION</h2>

      <div>
        <label className={labelCls}>Select Winner</label>
        <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className={selectCls}>
          <option value="">— choose a player —</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.gamertag}</option>
          ))}
        </select>
      </div>

      <button
        disabled={!winnerId || saving || saved}
        onClick={handleConfirm}
        className="btn-primary"
      >
        {saving ? 'SAVING...' : saved ? 'SAVED' : 'SAVE FINAL AWARD'}
      </button>

      {saved && (
        <p className="text-emerald-400 text-sm font-mono">✓ Award saved successfully.</p>
      )}
      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
          <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
        </div>
      )}
    </div>
  );
}
