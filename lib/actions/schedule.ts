'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createScheduledGame(input: {
  homeTeamId: string;
  awayTeamId: string;
  gameType: 'REGULAR' | 'PLAYOFF' | 'TOURNAMENT' | 'EXHIBITION';
  roundLabel?: string;
  tournamentId?: string;
  seriesId?: string;
  scheduledDate: string;
  scheduledTime: string;
  matchFormat?: string;
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');
  const supabase = createClient();

  // Find if there is an active bracket matchup for these two teams
  const { data: matchup } = await supabase
    .from('bracket_matchups')
    .select('id, schedule_id, match_format, team_a_id, team_b_id, tournaments(match_format)')
    .neq('status', 'COMPLETED')
    .or(`and(team_a_id.eq.${input.homeTeamId},team_b_id.eq.${input.awayTeamId}),and(team_a_id.eq.${input.awayTeamId},team_b_id.eq.${input.homeTeamId})`)
    .maybeSingle();

  // Find if there is an active series for these two teams
  let { data: series } = await supabase
    .from('series')
    .select('id, match_format')
    .eq('status', 'IN_PROGRESS')
    .or(`and(team_a_id.eq.${input.homeTeamId},team_b_id.eq.${input.awayTeamId}),and(team_a_id.eq.${input.awayTeamId},team_b_id.eq.${input.homeTeamId})`)
    .maybeSingle();

  // Determine matchFormat
  let matchFormat = 'BO1';
  if (series) {
    matchFormat = series.match_format;
  } else if (matchup) {
    matchFormat = matchup.match_format || (matchup.tournaments as any)?.match_format || 'BO1';
  } else if (input.tournamentId) {
    const { data: t } = await supabase.from('tournaments').select('match_format').eq('id', input.tournamentId).maybeSingle();
    if (t) matchFormat = t.match_format || 'BO1';
  }

  // If no series exists but a format requires it, create one
  if (!series && matchFormat !== 'BO1') {
    const { data: newSeries, error: seriesError } = await supabase.from('series').insert({
      bracket_matchup_id: matchup ? matchup.id : null,
      team_a_id: matchup && matchup.team_a_id ? matchup.team_a_id : input.homeTeamId,
      team_b_id: matchup && matchup.team_b_id ? matchup.team_b_id : input.awayTeamId,
      match_format: matchFormat,
      status: 'IN_PROGRESS',
    }).select('id, match_format').single();
    if (seriesError) throw seriesError;
    series = newSeries;
  }

  // Calculate Game Number
  let gameNumber = 1;
  if (series) {
    const { data: existingSchedules } = await supabase.from('schedules').select('id').eq('series_id', series.id);
    gameNumber = (existingSchedules?.length || 0) + 1;
  }

  // Auto-append Game X to round label
  let finalRoundLabel = input.roundLabel || '';
  if (finalRoundLabel && !finalRoundLabel.toLowerCase().includes('game')) {
    finalRoundLabel = `${finalRoundLabel} - Game ${gameNumber}`;
  } else if (!finalRoundLabel) {
    finalRoundLabel = `Game ${gameNumber}`;
  }

  // Create exactly 1 scheduled game
  const { data: insertedSchedule, error } = await supabase.from('schedules').insert({
    home_team_id: input.homeTeamId,
    away_team_id: input.awayTeamId,
    game_type: input.gameType,
    round_label: finalRoundLabel || null,
    tournament_id: input.tournamentId,
    series_id: series ? series.id : null,
    scheduled_date: input.scheduledDate,
    scheduled_time: input.scheduledTime,
    status: 'SCHEDULED',
  }).select('id').single();
  if (error) throw error;

  // Link to bracket matchup if this is the first game
  if (matchup && !matchup.schedule_id) {
    await supabase.from('bracket_matchups').update({ schedule_id: insertedSchedule.id }).eq('id', matchup.id);
  }

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
}

export async function updateGameStatus(scheduleId: string, status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED') {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('schedules').update({ status }).eq('id', scheduleId);
  if (error) throw error;

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
}

export async function updateSchedule(scheduleId: string, input: {
  scheduledDate?: string;
  scheduledTime?: string;
  gameType?: 'REGULAR' | 'PLAYOFF' | 'TOURNAMENT' | 'EXHIBITION';
  roundLabel?: string;
  status?: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  isArchived?: boolean;
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  
  const payload: any = {};
  if (input.scheduledDate !== undefined) payload.scheduled_date = input.scheduledDate || null;
  if (input.scheduledTime !== undefined) payload.scheduled_time = input.scheduledTime || null;
  if (input.gameType !== undefined) payload.game_type = input.gameType;
  if (input.roundLabel !== undefined) payload.round_label = input.roundLabel;
  if (input.status !== undefined) payload.status = input.status;
  if (input.isArchived !== undefined) payload.is_archived = input.isArchived;

  const { error } = await supabase.from('schedules').update(payload).eq('id', scheduleId);
  if (error) throw error;

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
}

export async function deleteSchedule(scheduleId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  
  // Remove reference from bracket_matchups to prevent foreign key constraint error
  await supabase.from('bracket_matchups').update({ schedule_id: null }).eq('schedule_id', scheduleId);

  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
  if (error) throw error;

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
  revalidatePath('/admin/games');
}
