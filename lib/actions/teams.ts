'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTeam(input: { tournamentId: string; name: string; shortName?: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('teams').insert({ tournament_id: input.tournamentId, name: input.name, short_name: input.shortName || null });
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function deleteTeam(teamId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function createPlayer(input: { gamertag: string; position?: string; tier?: number }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').insert({
    gamertag: input.gamertag,
    position: input.position || null,
    tier: input.tier || null,
  });
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function deletePlayer(playerId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function assignPlayerToTournamentTeam(input: { tournamentId: string; teamId: string; playerId: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('tournament_rosters').insert({
    tournament_id: input.tournamentId,
    team_id: input.teamId,
    player_id: input.playerId,
  });
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function removePlayerFromTournamentTeam(input: { tournamentId: string; playerId: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_rosters')
    .delete()
    .eq('tournament_id', input.tournamentId)
    .eq('player_id', input.playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function updatePlayerTier(playerId: string, tier: number | null) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').update({ tier }).eq('id', playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
  revalidatePath('/admin/players');
}

export async function updatePlayerName(playerId: string, gamertag: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').update({ gamertag }).eq('id', playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
  revalidatePath('/admin/players');
}

export async function updateTeamLogo(teamId: string, logoUrl: string | null) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('teams').update({ logo_url: logoUrl }).eq('id', teamId);
  if (error) throw error;

  revalidatePath('/admin/teams');
  revalidatePath('/');
  revalidatePath('/schedule');
}
