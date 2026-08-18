import { createClient } from '@/lib/supabase/server';
import CreateGameForm from '@/components/admin/CreateGameForm';
import ScheduleManager from '@/components/admin/ScheduleManager';
import AdminBackButton from '@/components/admin/AdminBackButton';

export default async function AdminSchedulePage() {
  const supabase = createClient();

  const [{ data: tournaments }, { data: rosters }, { data: games }] = await Promise.all([
    supabase.from('tournaments').select('id, name'),
    // Fetch all tournament rosters with team names — grouped by tournamentId on the client
    supabase
      .from('tournament_rosters')
      .select('tournament_id, team_id, team:teams(id, name)')
      .order('team_id'),
    supabase
      .from('schedules')
      .select('id, scheduled_date, scheduled_time, status, game_type, round_label, tournament:tournaments(name), home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name)')
      .order('scheduled_date', { ascending: true }),
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

  return (
    <div className="space-y-8">
      <AdminBackButton />
      <div>
        <h1 className="text-4xl text-bone">ADMIN SCHEDULE</h1>
        <p className="text-mute text-sm mt-1">Create, reschedule, and manage games across the season.</p>
      </div>

      <CreateGameForm tournaments={tournaments ?? []} rosterMap={rosterMap} />

      <div>
        <h2 className="text-lg text-bone mb-3">ALL GAMES</h2>
        <ScheduleManager games={games ?? []} />
      </div>
    </div>
  );
}
