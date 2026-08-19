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
  currentNotes,
  candidates,
}: {
  awardType: string;
  awardId: string | null;
  tournamentId: string;
  currentWinnerId: string | null;
  currentNotes: string;
  candidates: { id: string; gamertag: string }[];
}) {
  const [winnerId, setWinnerId] = useState(currentWinnerId ?? '');
  const [notes, setNotes] = useState(currentNotes);
  const [publishNotes, setPublishNotes] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const winnerName = candidates.find((c) => c.id === winnerId)?.gamertag ?? '';

  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      await finalizeAward({ awardType, awardId, tournamentId, winnerPlayerId: winnerId, notes, publishNotes });
      setConfirming(false);
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
      setConfirming(false);
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

      <div>
        <label className={labelCls}>Admin Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-silver-200 placeholder-silver-700 focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors resize-none"
          placeholder="Why this player is winning the award..."
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-silver-500 cursor-pointer">
        <input
          type="checkbox"
          checked={publishNotes}
          onChange={(e) => setPublishNotes(e.target.checked)}
          className="w-4 h-4 rounded border-surface-600 bg-surface-900 accent-white"
        />
        Publish notes alongside the award
      </label>

      <button
        disabled={!winnerId}
        onClick={() => setConfirming(true)}
        className="btn-primary"
      >
        SAVE FINAL AWARD
      </button>

      {saved && (
        <p className="text-emerald-400 text-sm font-mono">✓ Award saved successfully.</p>
      )}
      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
          <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card p-6 max-w-md w-full border-surface-500 shadow-2xl">
            <p className="text-xs font-mono text-silver-500 uppercase tracking-widest mb-3">⚠ Finalize Award</p>
            <p className="text-white leading-relaxed">
              You are about to officially award{' '}
              <span className="text-silver-200 font-display">{awardType.replace(/_/g, ' ')}</span>
              {' '}to{' '}
              <span className="text-white font-display">{winnerName}</span>.
              This becomes visible publicly once you separately press Publish.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setConfirming(false)} className="px-4 py-2 text-sm text-silver-500 hover:text-white transition-colors">
                CANCEL
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="btn-primary px-5"
              >
                {saving ? 'SAVING…' : 'CONFIRM AWARD'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
