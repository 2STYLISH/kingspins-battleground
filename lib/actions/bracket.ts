'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureScheduleForMatchup } from './bracket-scheduling';

/**
 * RULE 12: every administrative override is logged. This is the single
 * write path for manual bracket corrections (advance a team, change a seed,
 * reset a matchup, change a series winner) — all require a reason.
 */
export async function overrideBracketMatchup(input: {
  matchupId: string;
  action: 'ADVANCE_TEAM' | 'CHANGE_WINNER' | 'RESET_MATCHUP' | 'CHANGE_SEED' | 'ASSIGN_TEAMS';
  winnerTeamId?: string;
  teamAId?: string;
  teamBId?: string;
  matchFormat?: string;
  reason: string;
}) {
  const { isAdmin, user } = await requireAdmin();
  if (!isAdmin || !user) throw new Error('Admin authentication required.');
  if (!input.reason?.trim()) throw new Error('A reason is required for every bracket override.');

  const supabase = createClient();
  
  // Save match_format directly whenever it is provided (in any action context)
  if (input.matchFormat !== undefined) {
     await supabase.from('bracket_matchups').update({ match_format: input.matchFormat || null }).eq('id', input.matchupId);
  }

  if (input.action === 'RESET_MATCHUP') {
    await supabase.from('bracket_matchups').update({ winner_id: null, status: 'PENDING' }).eq('id', input.matchupId);
  } else if (input.action === 'ASSIGN_TEAMS') {
    const payload: any = { status: 'PENDING' };
    if (input.teamAId) payload.team_a_id = input.teamAId;
    if (input.teamBId) payload.team_b_id = input.teamBId;
    
    await supabase.from('bracket_matchups').update(payload).eq('id', input.matchupId);
    
    // Check if we need to create a schedule if both teams are now present
    const { data: matchup } = await supabase.from('bracket_matchups').select('tournament_id').eq('id', input.matchupId).single();
    if (matchup?.tournament_id && input.teamAId && input.teamBId) {
      await ensureScheduleForMatchup(supabase, matchup.tournament_id, input.matchupId);
    }
  } else if ((input.action === 'ADVANCE_TEAM' || input.action === 'CHANGE_WINNER') && input.winnerTeamId) {
    const { data: matchup } = await supabase
      .from('bracket_matchups')
      .select('id, schedule_id, feeds_into_matchup_id, loser_feeds_into_matchup_id, round, bracket_side, tournament_id, team_a_id, team_b_id')
      .eq('id', input.matchupId)
      .single();

    if (!matchup) throw new Error('Matchup not found');

    await supabase
      .from('bracket_matchups')
      .update({ winner_id: input.winnerTeamId, status: 'COMPLETED' })
      .eq('id', input.matchupId);

    // Mark the linked schedule as COMPLETED so it clears from the homepage
    if (matchup.schedule_id) {
      await supabase
        .from('schedules')
        .update({ status: 'COMPLETED' })
        .eq('id', matchup.schedule_id);
    }

    // Helper function to advance a team through potential BYE nodes
    async function propagateTeam(teamId: string, targetMatchupId: string) {
      let currentTargetId: string | null = targetMatchupId;

      while (currentTargetId) {
        const targetRes = await supabase
          .from('bracket_matchups')
          .select('id, team_a_id, team_b_id, is_bye, feeds_into_matchup_id')
          .eq('id', currentTargetId)
          .single();
        const target: any = targetRes.data;

        if (!target) break;

        const field = target.team_a_id ? 'team_b_id' : 'team_a_id';
        const payload: any = { [field]: teamId };

        if (target.is_bye) {
          // It's a bye node — the team gets a free pass. Set them as winner and keep looping.
          payload.winner_id = teamId;
          await supabase.from('bracket_matchups').update(payload).eq('id', target.id);
          currentTargetId = target.feeds_into_matchup_id;
        } else {
          // It's a real match — just place the team in the slot and stop.
          await supabase.from('bracket_matchups').update(payload).eq('id', target.id);
          break;
        }
      }
    }

    if (matchup?.feeds_into_matchup_id) {
      await propagateTeam(input.winnerTeamId, matchup.feeds_into_matchup_id);
    }

    if (matchup?.loser_feeds_into_matchup_id) {
      const loserTeamId = matchup.team_a_id === input.winnerTeamId ? matchup.team_b_id : matchup.team_a_id;
      if (loserTeamId) {
        await propagateTeam(loserTeamId, matchup.loser_feeds_into_matchup_id);
      }
    }

    // Grand Final Reset Logic
    if (matchup.bracket_side === 'GRAND_FINAL' && matchup.round === 1) {
      // Check if the winner came from the Losers Bracket
      // We can find out by checking which previous match the winner came from
      const { data: previousMatches } = await supabase
        .from('bracket_matchups')
        .select('bracket_side, winner_id')
        .eq('feeds_into_matchup_id', matchup.id);

      if (previousMatches) {
        const lbMatch = previousMatches.find(m => m.bracket_side === 'LOSERS');
        if (lbMatch && lbMatch.winner_id === input.winnerTeamId) {
          // The Losers Champion won! We need a Bracket Reset (Match 2).

          // Check if Reset match already exists
          const { data: existingReset } = await supabase
            .from('bracket_matchups')
            .select('id')
            .eq('tournament_id', matchup.tournament_id)
            .eq('bracket_side', 'GRAND_FINAL')
            .eq('round', 2)
            .maybeSingle();

          if (!existingReset) {
            // Generate Match 2
            const loserTeamId = matchup.team_a_id === input.winnerTeamId ? matchup.team_b_id : matchup.team_a_id;

            const resetInsertRes = await supabase.from('bracket_matchups').insert({
              tournament_id: matchup.tournament_id,
              round: 2,
              slot: 1,
              status: 'PENDING',
              bracket_side: 'GRAND_FINAL',
              team_a_id: input.winnerTeamId, // Losers Champ
              team_b_id: loserTeamId // Winners Champ
            }).select('id').single();
            const resetMatch: any = resetInsertRes.data;

            if (resetMatch) {
              await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: resetMatch.id }).eq('id', matchup.id);
              if (matchup.tournament_id) {
                await ensureScheduleForMatchup(supabase, matchup.tournament_id, resetMatch.id);
              }
            }
          }
        }
      }
    }
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    action: `BRACKET_OVERRIDE_${input.action}`,
    target_type: 'bracket_matchup',
    target_id: input.matchupId,
    reason: input.reason,
    metadata: { winnerTeamId: input.winnerTeamId ?? null, teamAId: input.teamAId ?? null, teamBId: input.teamBId ?? null },
  });

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/admin/schedule');
  revalidatePath('/admin/games');
  revalidatePath('/schedule');
  revalidatePath('/');
}
