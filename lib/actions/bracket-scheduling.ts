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
    .select('id, round, team_a_id, team_b_id, schedule_id, match_format, tournaments(match_format)')
    .eq('id', matchupId)
    .single();

  if (!matchup || !matchup.team_a_id || !matchup.team_b_id) {
    return;
  }

  const boFormat = matchup.match_format || (matchup.tournaments as any)?.match_format || 'BO1';
  let numGames = 1;
  if (boFormat === 'BO3') numGames = 3;
  else if (boFormat === 'BO5') numGames = 5;
  else if (boFormat === 'BO7') numGames = 7;
  else if (boFormat === 'TWICE_TO_BEAT') numGames = 2;

  // Find or create series
  let { data: series } = await supabase
    .from('series')
    .select('id')
    .eq('bracket_matchup_id', matchupId)
    .maybeSingle();

  if (!series) {
    const { data: newSeries, error: seriesError } = await supabase
      .from('series')
      .insert({
        bracket_matchup_id: matchupId,
        team_a_id: matchup.team_a_id,
        team_b_id: matchup.team_b_id,
        match_format: boFormat,
        status: 'IN_PROGRESS'
      })
      .select('id')
      .single();
    if (seriesError) throw seriesError;
    series = newSeries;
  } else {
    // Ensure the series teams are synced with the matchup in case of an override
    await supabase.from('series').update({
      team_a_id: matchup.team_a_id,
      team_b_id: matchup.team_b_id,
    }).eq('id', series.id);
  }

  // Removed auto-scheduling as requested by admins.
  // We only create the Series row so the BO format is tracked.
  // The actual schedules will be linked manually when created via Admin Schedule -> Create Game.
}
