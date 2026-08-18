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
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('schedules').insert({
    home_team_id: input.homeTeamId,
    away_team_id: input.awayTeamId,
    game_type: input.gameType,
    round_label: input.roundLabel,
    tournament_id: input.tournamentId,
    series_id: input.seriesId,
    scheduled_date: input.scheduledDate,
    scheduled_time: input.scheduledTime,
    status: 'SCHEDULED',
  });
  if (error) throw error;

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
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  
  const payload: any = {};
  if (input.scheduledDate !== undefined) payload.scheduled_date = input.scheduledDate;
  if (input.scheduledTime !== undefined) payload.scheduled_time = input.scheduledTime;
  if (input.gameType !== undefined) payload.game_type = input.gameType;
  if (input.roundLabel !== undefined) payload.round_label = input.roundLabel;
  if (input.status !== undefined) payload.status = input.status;

  const { error } = await supabase.from('schedules').update(payload).eq('id', scheduleId);
  if (error) throw error;

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
}

export async function deleteSchedule(scheduleId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
  if (error) throw error;

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
  revalidatePath('/admin/games');
}
