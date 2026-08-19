'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteTournament, updateTournamentChampionshipName, updateTournamentLogo } from '@/lib/actions/tournaments';
import { uploadFileBypassingRLS } from '@/lib/actions/upload';

export default function TournamentAdminActions({
  tournamentId,
  tournamentName,
  currentChampionshipName,
  currentLogoUrl,
}: {
  tournamentId: string;
  tournamentName: string;
  currentChampionshipName: string;
  currentLogoUrl: string;
}) {
  const router = useRouter();
  const [champName, setChampName] = useState(currentChampionshipName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function handleSaveChampName() {
    setSaving(true);
    setSaved(false);
    try {
      await updateTournamentChampionshipName(tournamentId, champName);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`DELETE "${tournamentName}"?\n\nThis will permanently delete the tournament, all its brackets, schedules, awards, and rosters. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteTournament(tournamentId);
      router.refresh();
    } catch (e: any) {
      alert('Failed to delete: ' + (e?.message ?? 'Unknown error'));
      setDeleting(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${tournamentId}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const publicUrl = await uploadFileBypassingRLS(formData, 'tournament-logos', path);
      
      const cacheBustedUrl = publicUrl + `?t=${Date.now()}`;
      await updateTournamentLogo(tournamentId, cacheBustedUrl);
      setLogoUrl(cacheBustedUrl);
      router.refresh();
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="pt-3 border-t border-surface-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Logo Upload */}
      <div className="flex items-center gap-3">
        <label htmlFor={`tourney-logo-${tournamentId}`} className="w-10 h-10 rounded bg-surface-800 flex items-center justify-center border border-surface-600 cursor-pointer overflow-hidden relative hover:border-gold/50 transition-colors shrink-0">
          {uploading ? (
            <span className="text-[9px] text-mute font-mono">...</span>
          ) : logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] text-mute font-mono">LOGO</span>
          )}
          <input id={`tourney-logo-${tournamentId}`} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
        </label>
      </div>
      {/* Championship award name */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <label className="text-[10px] font-mono text-silver-500 uppercase tracking-widest whitespace-nowrap">
          Champion Award Name
        </label>
        <input
          type="text"
          value={champName}
          onChange={(e) => setChampName(e.target.value)}
          placeholder={`e.g. ${tournamentName} Champion`}
          className="flex-1 min-w-0 bg-surface-900 border border-surface-600 rounded px-2 py-1 text-sm text-silver-200 placeholder-silver-700 focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors"
        />
        <button
          onClick={handleSaveChampName}
          disabled={saving}
          className="text-[10px] font-mono text-silver-400 hover:text-white uppercase tracking-widest border border-surface-600 rounded px-2 py-1 hover:border-silver-400 transition-colors whitespace-nowrap"
        >
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-[10px] font-mono text-crimson-500 hover:text-crimson-300 uppercase tracking-widest transition-colors"
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );
}
