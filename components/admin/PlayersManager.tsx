'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlayer, deletePlayer, updatePlayerTier, updatePlayerName } from '@/lib/actions/teams';

interface Player {
  id: string;
  gamertag: string;
  position: string | null;
  tier: number | null;
}

export default function PlayersManager({ players }: { players: Player[] }) {
  const router = useRouter();
  const [gamertag, setGamertag] = useState('');
  const [tier, setTier] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  async function handleCreatePlayer() {
    if (!gamertag.trim()) return;
    setBusy(true);
    try {
      await createPlayer({ gamertag: gamertag.trim(), tier: tier === '' ? undefined : tier });
      setGamertag('');
      setTier('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(playerId: string, tag: string) {
    if (!confirm(`Delete player ${tag}? This will remove them from all rosters and stats.`)) return;
    setBusy(true);
    try {
      await deletePlayer(playerId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateTier(playerId: string, newTier: number | null) {
    setBusy(true);
    try {
      await updatePlayerTier(playerId, newTier);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveName(playerId: string) {
    if (!editName.trim()) return;
    setBusy(true);
    try {
      await updatePlayerName(playerId, editName.trim());
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-display text-sm text-silver-400 uppercase tracking-widest mb-4">Register New Player</h2>
        <div className="flex gap-3">
          <input
            value={gamertag}
            onChange={(e) => setGamertag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()}
            placeholder="Gamertag"
            className="input-field"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value ? parseInt(e.target.value) : '')}
            className="input-field w-32"
          >
            <option value="">No Tier</option>
            {[1, 2, 3, 4, 5, 6].map(t => <option key={t} value={t}>Tier {t}</option>)}
          </select>
          <button onClick={handleCreatePlayer} disabled={busy || !gamertag.trim()} className="btn-primary whitespace-nowrap">
            REGISTER
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-900 border-b border-surface-700 text-silver-500 font-mono text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-5 py-3">Gamertag</th>
              <th className="px-5 py-3 w-40">Tier</th>
              <th className="px-5 py-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {players.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-silver-600">
                  No players registered. Add one above.
                </td>
              </tr>
            )}
            {players.map(p => (
              <tr key={p.id} className="hover:bg-surface-900/50 transition-colors">
                <td className="px-5 py-3 font-display tracking-widest text-white">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName(p.id)}
                        className="bg-surface-800 border border-surface-600 rounded px-2 py-1 text-xs outline-none w-32"
                        autoFocus
                      />
                      <button onClick={() => handleSaveName(p.id)} className="text-[10px] text-gold hover:text-gold/80">SAVE</button>
                      <button onClick={() => setEditingId(null)} className="text-[10px] text-silver-500 hover:text-white">CANCEL</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group/name">
                      <span>{p.gamertag}</span>
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.gamertag); }}
                        className="text-[10px] text-silver-600 hover:text-white opacity-0 group-hover/name:opacity-100 transition-opacity"
                      >
                        EDIT
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={p.tier || ''}
                    onChange={(e) => handleUpdateTier(p.id, e.target.value ? parseInt(e.target.value) : null)}
                    disabled={busy}
                    className="bg-surface-800 border border-surface-600 rounded text-xs text-silver-300 px-2 py-1 focus:outline-none uppercase tracking-widest w-full"
                  >
                    <option value="">No Tier</option>
                    {[1, 2, 3, 4, 5, 6].map((t) => (
                      <option key={t} value={t}>Tier {t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(p.id, p.gamertag)}
                    disabled={busy}
                    className="text-[10px] font-mono text-silver-600 hover:text-crimson-400 transition-colors uppercase tracking-widest"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
