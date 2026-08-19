'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { createPlayer, deletePlayer, updatePlayerTier, updatePlayerName } from '@/lib/actions/teams';
import { updatePlayerPhoto } from '@/lib/actions/players';
import { uploadFileBypassingRLS } from '@/lib/actions/upload';

interface Player {
  id: string;
  gamertag: string;
  position: string | null;
  tier: number | null;
  photo_path?: string | null;
  slug?: string;
}

export default function PlayersManager({ players }: { players: Player[] }) {
  const router = useRouter();
  const [gamertag, setGamertag] = useState('');
  const [tier, setTier] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<number | 'ALL'>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filteredPlayers = players.filter(p => {
    if (filterTier !== 'ALL' && p.tier !== filterTier) return false;
    if (searchQuery.trim() && !p.gamertag.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredPlayers.length / pageSize);
  const displayedPlayers = filteredPlayers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  async function handleUploadPhoto(playerId: string, file: File) {
    setBusy(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${playerId}-${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', file);

      const publicUrl = await uploadFileBypassingRLS(formData, 'player-photos', fileName);

      await updatePlayerPhoto(playerId, publicUrl);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Failed to upload player photo.');
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

      <div className="flex gap-4 items-center">
        <h2 className="font-display text-sm text-silver-400 uppercase tracking-widest flex-shrink-0">Player Roster ({filteredPlayers.length})</h2>
        <input
          type="text"
          placeholder="Search gamertag..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="input-field max-w-xs"
        />
        <select
          value={filterTier}
          onChange={e => { setFilterTier(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setCurrentPage(1); }}
          className="input-field w-32"
        >
          <option value="ALL">All Tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
          <option value="4">Tier 4</option>
          <option value="5">Tier 5</option>
          <option value="6">Tier 6</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-900 border-b border-surface-700 text-silver-500 font-mono text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-5 py-3 w-16">Photo</th>
              <th className="px-5 py-3">Gamertag</th>
              <th className="px-5 py-3 w-40">Tier</th>
              <th className="px-5 py-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {displayedPlayers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-silver-600">
                  No players found matching your criteria.
                </td>
              </tr>
            )}
            {displayedPlayers.map(p => (
              <tr key={p.id} className="hover:bg-surface-900/50 transition-colors">
                <td className="px-5 py-3">
                  <label className="cursor-pointer block relative group/photo">
                    {p.photo_path ? (
                      <img src={p.photo_path} alt={p.gamertag} className="w-8 h-8 rounded object-cover border border-surface-600 bg-surface-900" />
                    ) : (
                      <img src="/logo2.png" alt={p.gamertag} className="w-8 h-8 rounded object-cover border border-surface-600 bg-surface-900 opacity-80" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadPhoto(p.id, e.target.files[0]);
                        }
                      }}
                      disabled={busy}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity rounded">
                      <span className="text-[8px] text-white font-bold font-mono">↑</span>
                    </div>
                  </label>
                </td>
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
                      <Link href={`/${p.slug || p.gamertag.toLowerCase()}`} className="hover:text-gold transition-colors underline decoration-transparent hover:decoration-gold underline-offset-4">
                        {p.gamertag}
                      </Link>
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.gamertag); }}
                        className="text-[10px] text-silver-500 hover:text-white transition-opacity font-mono"
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
            {totalPages > 1 && (
              <tr>
                <td colSpan={4} className="px-5 py-4 bg-surface-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-silver-500 font-mono text-[10px] uppercase tracking-widest">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPlayers.length)} of {filteredPlayers.length} players
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-surface-800 border border-surface-600 rounded text-[10px] font-mono text-white hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        PREV
                      </button>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 bg-surface-800 border border-surface-600 rounded text-[10px] font-mono text-white hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        NEXT
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
