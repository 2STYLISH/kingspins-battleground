'use client';

import { useState } from 'react';
import { publishAward } from '@/lib/actions/awards';

export default function PublishAwardButton({
  awardId,
  awardType,
  winnerName,
}: {
  awardId: string;
  awardType: string;
  winnerName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await publishAward(awardId, awardType);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="btn-primary"
      >
        PUBLISH AWARD
      </button>

      {confirming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card p-6 max-w-md w-full border-surface-500 shadow-2xl">
            <p className="text-xs font-mono text-silver-500 uppercase tracking-widest mb-3">⚠ Publish Award</p>
            <p className="text-white leading-relaxed">
              <span className="text-silver-300 font-display">{awardType.replace(/_/g, ' ')}</span>
              {' — '}
              <span className="text-white font-display">{winnerName}</span>
              {' '}will become visible to the public on the awards page. This cannot be un-published from here.
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
                {saving ? 'PUBLISHING…' : 'CONFIRM PUBLISH'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
