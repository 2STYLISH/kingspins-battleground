'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeam, deleteTeam, createPlayer, assignPlayerToTournamentTeam, removePlayerFromTournamentTeam, updatePlayerTier } from '@/lib/actions/teams';

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  tournament_id: string;
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

  async function handleCreateTeam() {
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

  return (
    <div className="space-y-6">
      {/* Top controls: Create Team & Select Tournament */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-display text-sm text-silver-400 uppercase tracking-widest mb-4">New Team</h2>
          <div className="flex gap-3">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
              placeholder="Team name"
              className="input-field"
            />
            <button onClick={handleCreateTeam} disabled={busy || !newTeamName.trim()} className="btn-primary whitespace-nowrap">
              ADD TEAM
            </button>
          </div>
        </div>

        <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
          <h2 className="font-display text-sm text-gold uppercase tracking-widest mb-4">Active Tournament Rosters</h2>
          <select 
            value={activeTournament} 
            onChange={e => setActiveTournament(e.target.value)}
            className="input-field py-2"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
            ))}
            {tournaments.length === 0 && <option value="">No tournaments found</option>}
          </select>
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
  const [gamertag, setGamertag] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredPlayers = unassignedPlayers.filter(p => p.gamertag.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="card p-5 flex flex-col">
      {/* Team header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-700">
        <p className="text-base text-white font-display tracking-widest">{team.name}</p>
        <button onClick={handleDeleteTeam} className="text-xs text-silver-600 hover:text-silver-300 transition-colors font-mono">
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
          <button onClick={handleAddExistingPlayer} disabled={busy || !searchQuery} className="btn-secondary text-xs px-3 py-1">
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
