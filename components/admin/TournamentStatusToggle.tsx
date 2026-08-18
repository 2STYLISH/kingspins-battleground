'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTournamentStatus } from '@/lib/actions/tournaments';

const STATUSES = ['DRAFT', 'SEEDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function TournamentStatusToggle({ tournamentId, currentStatus }: { tournamentId: string, currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (newStatus === status) return;
    setStatus(newStatus);
    setBusy(true);
    try {
      await updateTournamentStatus(tournamentId, newStatus as any);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-silver-500 uppercase tracking-widest">Status</label>
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={busy}
        className="input-field py-1.5 text-xs font-mono uppercase w-40"
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  );
}
