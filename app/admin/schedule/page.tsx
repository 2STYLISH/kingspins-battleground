import { createClient } from '@/lib/supabase/server';
import CreateGameForm from '@/components/admin/CreateGameForm';
import ScheduleManager from '@/components/admin/ScheduleManager';
import BackButton from '@/components/BackButton';

export default async function AdminSchedulePage() {
  const supabase = createClient();

  const [{ data: tournaments }, { data: rosters }, { data: games }, { data: matchups }] = await Promise.all([
    supabase.from('tournaments').select('id, name').neq('status', 'COMPLETED'),
    // Fetch all tournament rosters with team names — grouped by tournamentId on the client
    supabase
      .from('tournament_rosters')
      .select('tournament_id, team_id, team:teams(id, name)')
      .order('team_id'),
    supabase
      .from('schedules')
      .select('id, scheduled_date, scheduled_time, status, game_type, round_label, is_archived, series_id, tournament:tournaments(name), home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name)')
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('bracket_matchups')
      .select('id, tournament_id, team_a_id, team_b_id, status, bracket_side, round, team_a:teams!bracket_matchups_team_a_id_fkey(name), team_b:teams!bracket_matchups_team_b_id_fkey(name), series(id)')
      .not('team_a_id', 'is', null)
      .not('team_b_id', 'is', null)
      .neq('status', 'COMPLETED'),
  ]);

  // Build a map: tournamentId -> unique teams registered in it
  const rosterMap: Record<string, { id: string; name: string }[]> = {};
  for (const row of rosters ?? []) {
    const team = row.team as any;
    if (!team) continue;
    if (!rosterMap[row.tournament_id]) rosterMap[row.tournament_id] = [];
    if (!rosterMap[row.tournament_id].some((t) => t.id === team.id)) {
      rosterMap[row.tournament_id].push({ id: team.id, name: team.name });
    }
  }

  // Build a map: tournamentId -> matchups
  const matchupsMap: Record<string, any[]> = {};
  for (const m of matchups ?? []) {
    if (!matchupsMap[m.tournament_id]) matchupsMap[m.tournament_id] = [];
    matchupsMap[m.tournament_id].push(m);
  }

  return (
    <div className="space-y-8">
      <BackButton />
      <div>
        <h1 className="text-4xl text-bone">ADMIN SCHEDULE</h1>
        <p className="text-mute text-sm mt-1">Create, reschedule, and manage games across the season.</p>
      </div>

      <CreateGameForm tournaments={tournaments ?? []} rosterMap={rosterMap} matchupsMap={matchupsMap} schedules={games ?? []} />

      <div>
        <h2 className="text-lg text-bone mb-3">ALL GAMES</h2>
        <ScheduleManager games={games ?? []} />
      </div>
    </div>
  );
}
