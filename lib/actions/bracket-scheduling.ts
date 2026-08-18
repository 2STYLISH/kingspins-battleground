import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Once both sides of a bracket matchup are set (via seeding or an advance/
 * override), make sure a matching `schedules` row exists so the matchup
 * immediately shows up in Admin > Schedule and Admin > Games & Screenshots
 * (screenshot upload + AI stat verification both key off `schedules`).
 *
 * Idempotent — does nothing if either slot is still empty or a schedule is
 * already linked to this matchup.
 */
export async function ensureScheduleForMatchup(
  supabase: SupabaseClient,
  tournamentId: string,
  matchupId: string
) {
  const { data: matchup } = await supabase
    .from('bracket_matchups')
    .select('id, round, team_a_id, team_b_id, schedule_id')
    .eq('id', matchupId)
    .single();

  if (!matchup || !matchup.team_a_id || !matchup.team_b_id || matchup.schedule_id) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: schedule, error } = await supabase
    .from('schedules')
    .insert({
      home_team_id: matchup.team_a_id,
      away_team_id: matchup.team_b_id,
      tournament_id: tournamentId,
      game_type: 'TOURNAMENT',
      round_label: `Round ${matchup.round}`,
      scheduled_date: today,
      scheduled_time: '00:00',
      status: 'SCHEDULED',
    })
    .select('id')
    .single();
  if (error) throw error;

  await supabase.from('bracket_matchups').update({ schedule_id: schedule.id }).eq('id', matchupId);
}
