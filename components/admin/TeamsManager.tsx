'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createTeam, deleteTeam, assignPlayerToTournamentTeam, removePlayerFromTournamentTeam, updateTeamLogo } from '@/lib/actions/teams';
import { updateTournamentLogo } from '@/lib/actions/tournaments';
import { uploadFileBypassingRLS } from '@/lib/actions/upload';

interface Tournament {
  id: string;
  name: string;
  status: string;
  logo_url: string | null;
}

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  tournament_id: string;
  logo_url: string | null;
}

interface Player {
  id: string;
  gamertag: string;
  position: string | null;
  tier: number | null;
}

interface RosterEntry {
  tournament_id: string;
  team_id: string;
  player_id: string;
}

export default function TeamsManager({
  tournaments,
  teams,
  players,
  rosters,
}: {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  rosters: RosterEntry[];
}) {
  const router = useRouter();
  const [newTeamName, setNewTeamName] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTournament, setActiveTournament] = useState<string>(tournaments[0]?.id || '');

  async function handleCreateTeam(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTeamName.trim()) return;
    setBusy(true);
    try {
      await createTeam({ tournamentId: activeTournament, name: newTeamName.trim() });
      setNewTeamName('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const [uploadingTourney, setUploadingTourney] = useState(false);
  async function handleTourneyLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeTournament) return;
    setUploadingTourney(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${activeTournament}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const publicUrl = await uploadFileBypassingRLS(formData, 'tournament-logos', path);
      
      await updateTournamentLogo(activeTournament, publicUrl + `?t=${Date.now()}`);
      router.refresh();
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingTourney(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top controls: Create Team & Select Tournament */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-display text-sm text-silver-400 uppercase tracking-widest mb-4">New Team</h2>
          <form className="flex gap-3" onSubmit={handleCreateTeam}>
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name"
              className="input-field"
            />
            <button type="submit" disabled={busy || !newTeamName.trim()} className="btn-primary whitespace-nowrap">
              ADD TEAM
            </button>
          </form>
        </div>

        <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
          <h2 className="font-display text-sm text-gold uppercase tracking-widest mb-4">Active Tournament Rosters</h2>
          <div className="flex items-center gap-3">
            <label htmlFor="tourney-logo-upload" className="relative cursor-pointer group shrink-0" title="Click to upload tournament logo">
              <div className="w-10 h-10 rounded border border-surface-600 bg-surface-800 flex items-center justify-center overflow-hidden group-hover:border-gold/50 transition-colors">
                {uploadingTourney ? (
                  <span className="text-[9px] text-mute font-mono">...</span>
                ) : tournaments.find(t => t.id === activeTournament)?.logo_url ? (
                  <img 
                    src={tournaments.find(t => t.id === activeTournament)?.logo_url!} 
                    alt="Tournament Logo" 
                    className="w-full h-full object-cover bg-surface-800"
                  />
                ) : (
                  <span className="text-[9px] text-mute font-mono group-hover:text-silver-300 transition-colors">LOGO</span>
                )}
              </div>
              <input
                id="tourney-logo-upload"
                type="file"
                accept="image/*"
                onChange={handleTourneyLogoUpload}
                disabled={uploadingTourney || !activeTournament}
                className="sr-only"
              />
            </label>
            <select 
              value={activeTournament} 
              onChange={e => setActiveTournament(e.target.value)}
              className="input-field py-2 flex-1"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
              ))}
              {tournaments.length === 0 && <option value="">No tournaments found</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Team cards grid for the active tournament */}
      {activeTournament ? (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.filter(t => t.tournament_id === activeTournament).length === 0 && (
            <p className="text-silver-600 text-sm col-span-2">No teams yet. Create your first team above.</p>
          )}
          {teams.filter(t => t.tournament_id === activeTournament).map((team) => {
            const teamRosterIds = rosters.filter(r => r.tournament_id === activeTournament && r.team_id === team.id).map(r => r.player_id);
            const teamRoster = players.filter(p => teamRosterIds.includes(p.id));
            const tournamentRosterIds = rosters.filter(r => r.tournament_id === activeTournament).map(r => r.player_id);
            const unassignedPlayers = players.filter(p => !tournamentRosterIds.includes(p.id));

            return (
              <TeamCard 
                key={team.id} 
                team={team} 
                roster={teamRoster} 
                tournamentId={activeTournament}
                unassignedPlayers={unassignedPlayers}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-silver-600 text-sm">Please create a tournament first to manage rosters.</p>
      )}
    </div>
  );
}

function TeamCard({ team, roster, tournamentId, unassignedPlayers }: { team: Team; roster: Player[]; tournamentId: string; unassignedPlayers: Player[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(team.logo_url ?? '');

  async function handleAddExistingPlayer() {
    if (!searchQuery) return;
    const player = unassignedPlayers.find((p) => p.gamertag === searchQuery);
    if (!player) return;
    
    setBusy(true);
    try {
      await assignPlayerToTournamentTeam({ tournamentId, teamId: team.id, playerId: player.id });
      setSearchQuery('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePlayer(playerId: string) {
    await removePlayerFromTournamentTeam({ tournamentId, playerId });
    router.refresh();
  }

  async function handleDeleteTeam() {
    if (!confirm(`Delete ${team.name}? This removes it from ALL tournaments.`)) return;
    await deleteTeam(team.id);
    router.refresh();
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
      const path = `${team.id}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const publicUrl = await uploadFileBypassingRLS(formData, 'team-logos', path);
      
      const cacheBustedUrl = publicUrl + `?t=${Date.now()}`;
      await updateTeamLogo(team.id, cacheBustedUrl);
      setLogoUrl(cacheBustedUrl);
      router.refresh();
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-5 flex flex-col">
      {/* Team header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-700">
        <div className="flex items-center gap-3">
          {/* Logo preview / upload */}
          <label htmlFor={`logo-upload-${team.id}`} className="relative cursor-pointer group" title="Click to upload logo">
            <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-600 group-hover:border-silver-400 transition-colors overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-mono text-silver-500 group-hover:text-silver-300 transition-colors">
                  {uploading ? '…' : 'LOGO'}
                </span>
              )}
            </div>
            <input
              id={`logo-upload-${team.id}`}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
          <p className="text-base text-white font-display tracking-widest">{team.name}</p>
        </div>
        <button type="button" onClick={handleDeleteTeam} className="text-xs text-silver-600 hover:text-silver-300 transition-colors font-mono">
          DELETE TEAM
        </button>
      </div>

      {/* Roster list */}
      <div className="space-y-1 mb-4 flex-1">
        {roster.length === 0 && <p className="text-silver-600 text-xs font-mono">No players registered for this tournament.</p>}
        {roster.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm group py-1">
            <div className="flex items-center gap-3">
              <span className="text-silver-300">{p.gamertag}</span>
              {p.tier && <span className="text-[10px] text-silver-500 uppercase font-mono tracking-widest">T{p.tier}</span>}
            </div>
            <button
              type="button"
              onClick={() => handleRemovePlayer(p.id)}
              className="text-[10px] text-silver-700 hover:text-crimson-400 opacity-0 group-hover:opacity-100 transition-all font-mono uppercase tracking-widest"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add player */}
      <div className="pt-3 border-t border-surface-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-silver-500 uppercase tracking-widest">Register Player</span>
        </div>

        <div className="flex gap-2">
          <input 
            list={`players-${team.id}`}
            placeholder="Type to search player..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-surface-900 border border-surface-600 rounded-lg px-2 py-1.5 text-sm text-silver-200 focus:outline-none"
          />
          <datalist id={`players-${team.id}`}>
            {unassignedPlayers.map(p => (
              <option key={p.id} value={p.gamertag} />
            ))}
          </datalist>
          <button type="button" onClick={handleAddExistingPlayer} disabled={busy || !searchQuery} className="btn-secondary text-xs px-3 py-1">
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
