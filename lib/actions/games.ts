'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseGameScreenshot } from '@/lib/services/screenshot-parser';
import { recomputeAwardCandidates } from '@/lib/actions/awards-compute';
import { ensureScheduleForMatchup } from '@/lib/actions/bracket-scheduling';
import { revalidatePath } from 'next/cache';
import type { ScreenshotExtractionResult } from '@/lib/types';

// Ensure a `games` row exists for a scheduled game, creating one on first upload.
export async function ensureGameForSchedule(scheduleId: string) {
  const supabase = createClient();
  const { data: existing } = await supabase.from('games').select('id').eq('schedule_id', scheduleId).maybeSingle();
  if (existing) return existing.id;

  const { data: schedule } = await supabase
    .from('schedules')
    .select('home_team_id, away_team_id, series_id')
    .eq('id', scheduleId)
    .single();

  const { data: created, error } = await supabase
    .from('games')
    .insert({
      schedule_id: scheduleId,
      series_id: schedule?.series_id ?? null,
      home_team_id: schedule?.home_team_id,
      away_team_id: schedule?.away_team_id,
      status: 'AWAITING_STATS',
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

/**
 * UPLOAD + ANALYZE (once per screenshot)
 * Stores the image in Supabase Storage, calls the AI parser exactly once,
 * and stores the raw extraction for the admin to review. Does NOT write
 * verified player_game_stats — that only happens when the admin saves.
 */
export async function uploadAndAnalyzeScreenshot(input: {
  scheduleId: string;
  fileBase64: string; // no data: prefix
  fileName: string;
  contentType: string;
}) {
  const { isAdmin, user } = await requireAdmin();
  if (!isAdmin || !user) throw new Error('Admin authentication required.');

  const gameId = await ensureGameForSchedule(input.scheduleId);

  const admin = createAdminClient();
  const path = `season-1/game-${gameId}/${Date.now()}-${input.fileName}`;
  const bytes = Buffer.from(input.fileBase64, 'base64');

  const { error: uploadError } = await admin.storage
    .from('game-screenshots')
    .upload(path, bytes, { contentType: input.contentType, upsert: false });
  if (uploadError) throw uploadError;

  const result = await parseGameScreenshot(input.fileBase64);
  const { extraction, error: aiError } = result;

  const supabase = createClient();
  const { error: insertError } = await supabase.from('game_screenshots').insert({
    game_id: gameId,
    storage_path: path,
    uploaded_by: user.id,
    // Store error message in extraction so UI can display it
    ai_extraction: aiError ? { ...extraction, _error: aiError } : extraction,
    ai_confidence: extraction.confidence,
  });
  if (insertError) throw insertError;

  await supabase.from('games').update({ status: 'STATS_UNDER_REVIEW' }).eq('id', gameId);

  revalidatePath('/admin/games');
  revalidatePath(`/admin/games/${input.scheduleId}`);
  return { gameId, extraction };
}

/** Explicit re-analyze — never called automatically, only on admin click. */
export async function reanalyzeScreenshot(screenshotId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const admin = createAdminClient();
  const supabase = createClient();

  const { data: shot } = await supabase
    .from('game_screenshots')
    .select('id, game_id, storage_path')
    .eq('id', screenshotId)
    .single();
  if (!shot) throw new Error('Screenshot not found.');

  const { data: file, error: downloadError } = await admin.storage.from('game-screenshots').download(shot.storage_path);
  if (downloadError || !file) throw downloadError ?? new Error('Could not download screenshot.');

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const result = await parseGameScreenshot(base64);
  const { extraction, error: aiError } = result;

  await supabase
    .from('game_screenshots')
    .update({
      ai_extraction: aiError ? { ...extraction, _error: aiError } : extraction,
      ai_confidence: extraction.confidence,
    })
    .eq('id', screenshotId);

  revalidatePath(`/admin/games/${shot.game_id}`);
  return extraction;
}

/**
 * SAVE + VERIFY
 * Admin-reviewed (possibly corrected) stats are written as the permanent,
 * verified record. This is the only path that sets is_verified = true and
 * moves a game to VERIFIED — matches RULE 2/3 in the spec: AI extracts,
 * admin verifies, verified data updates the stats engine.
 */
export async function saveVerifiedGameStats(input: {
  gameId: string;
  homeScore: number;
  awayScore: number;
  players: {
    playerId: string;
    teamId: string;
    didNotPlay: boolean;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    fgm: number;
    fga: number;
    tpm: number;
    tpa: number;
    ftm: number;
    fta: number;
    turnovers: number;
    position?: string;
  }[];
}) {
  const { isAdmin, user } = await requireAdmin();
  if (!isAdmin || !user) throw new Error('Admin authentication required.');

  const supabase = createClient();

  const rows = input.players.map((p) => ({
    game_id: input.gameId,
    player_id: p.playerId,
    team_id: p.teamId,
    // DNP players are stored with zeroed stats and excluded from averages/awards
    did_not_play: p.didNotPlay,
    pts: p.didNotPlay ? 0 : p.pts,
    reb: p.didNotPlay ? 0 : p.reb,
    ast: p.didNotPlay ? 0 : p.ast,
    stl: p.didNotPlay ? 0 : p.stl,
    blk: p.didNotPlay ? 0 : p.blk,
    fgm: p.didNotPlay ? 0 : p.fgm,
    fga: p.didNotPlay ? 0 : p.fga,
    tpm: p.didNotPlay ? 0 : p.tpm,
    tpa: p.didNotPlay ? 0 : p.tpa,
    ftm: p.didNotPlay ? 0 : p.ftm,
    fta: p.didNotPlay ? 0 : p.fta,
    turnovers: p.didNotPlay ? 0 : p.turnovers,
    is_verified: true,
    position: p.position || null,
  }));

  const { error: statsError } = await supabase.from('player_game_stats').upsert(rows, { onConflict: 'game_id,player_id' });
  if (statsError) throw statsError;

  const { error: gameError } = await supabase
    .from('games')
    .update({
      home_score: input.homeScore,
      away_score: input.awayScore,
      status: 'VERIFIED',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      played_at: new Date().toISOString(),
    })
    .eq('id', input.gameId);
  if (gameError) throw gameError;

  // ── Auto-advance bracket & mark schedule COMPLETED ────────────────────────
  const { data: game } = await supabase
    .from('games')
    .select('schedule_id, home_team_id, away_team_id, series_id, schedules(tournament_id)')
    .eq('id', input.gameId)
    .single();

  if (game?.schedule_id) {
    // 1. Mark the schedule as COMPLETED
    await supabase
      .from('schedules')
      .update({ status: 'COMPLETED' })
      .eq('id', game.schedule_id);

    const tournamentId = (game.schedules as any)?.tournament_id;
    if (tournamentId && game.home_team_id && game.away_team_id) {
      // 2. Find the bracket matchup matching these two teams
      // First try exact schedule match
      let { data: matchups } = await supabase
        .from('bracket_matchups')
        .select('id, tournament_id, bracket_side, round, team_a_id, team_b_id, feeds_into_matchup_id, loser_feeds_into_matchup_id')
        .eq('schedule_id', game.schedule_id)
        .limit(1);

      // If no exact match (e.g. manually created schedule), try fuzzy matching earliest PENDING matchup
      if (!matchups || matchups.length === 0) {
        const { data: fuzzy } = await supabase
          .from('bracket_matchups')
          .select('id, tournament_id, bracket_side, round, team_a_id, team_b_id, feeds_into_matchup_id, loser_feeds_into_matchup_id')
          .eq('tournament_id', tournamentId)
          .neq('status', 'COMPLETED')
          .or(`and(team_a_id.eq.${game.home_team_id},team_b_id.eq.${game.away_team_id}),and(team_a_id.eq.${game.away_team_id},team_b_id.eq.${game.home_team_id})`)
          .order('round', { ascending: true })
          .limit(1);
        matchups = fuzzy;
      }

      const matchup = matchups?.[0];

      if (matchup) {
        // 3. Determine winner of this game
        const gameWinnerId = input.homeScore > input.awayScore ? game.home_team_id : game.away_team_id;

        let seriesWinnerId: string | null = null;
        let seriesCompleted = true;

        if (game.series_id) {
          const { data: series } = await supabase.from('series').select('*').eq('id', game.series_id).single();
          if (series) {
            // Recalculate wins from all verified games in the series to prevent double-counting on edits
            const { data: seriesGames } = await supabase
              .from('games')
              .select('home_team_id, away_team_id, home_score, away_score')
              .eq('series_id', series.id)
              .in('status', ['VERIFIED', 'COMPLETED']);

            let teamAWins = 0;
            let teamBWins = 0;

            for (const g of seriesGames || []) {
              const gwId = g.home_score > g.away_score ? g.home_team_id : g.away_team_id;
              if (gwId === series.team_a_id) teamAWins++;
              else if (gwId === series.team_b_id) teamBWins++;
            }

            let requiredWinsA = 1;
            let requiredWinsB = 1;
            if (series.match_format === 'BO3') { requiredWinsA = 2; requiredWinsB = 2; }
            else if (series.match_format === 'BO5') { requiredWinsA = 3; requiredWinsB = 3; }
            else if (series.match_format === 'BO7') { requiredWinsA = 4; requiredWinsB = 4; }
            else if (series.match_format === 'TWICE_TO_BEAT') {
              requiredWinsA = 1; // Team A (upper seed) needs 1 win
              requiredWinsB = 2; // Team B (lower seed) needs 2 wins
            }

            if (teamAWins >= requiredWinsA) {
              seriesWinnerId = series.team_a_id;
            } else if (teamBWins >= requiredWinsB) {
              seriesWinnerId = series.team_b_id;
            } else {
              seriesCompleted = false;
            }

            await supabase
              .from('series')
              .update({
                team_a_wins: teamAWins,
                team_b_wins: teamBWins,
                status: seriesWinnerId ? 'COMPLETED' : 'IN_PROGRESS',
                winner_id: seriesWinnerId
              })
              .eq('id', series.id);
            
            if (seriesWinnerId) {
              await supabase.from('schedules').update({ status: 'CANCELLED' }).eq('series_id', series.id).eq('status', 'SCHEDULED');
            }
          }
        } else {
           seriesWinnerId = gameWinnerId;
        }

        if (seriesCompleted && seriesWinnerId) {
          // 4. Mark matchup as COMPLETED with winner
          await supabase
            .from('bracket_matchups')
            .update({ winner_id: seriesWinnerId, status: 'COMPLETED', schedule_id: game.schedule_id })
            .eq('id', matchup.id);

        const matchupTeams = [matchup.team_a_id, matchup.team_b_id].filter(Boolean) as string[];

        // Helper function to advance a team through potential BYE nodes
        async function propagateTeam(teamId: string, targetMatchupId: string, possibleReplacedTeams: string[]) {
          let currentTargetId: string | null = targetMatchupId;

          while (currentTargetId) {
            const response = await supabase
              .from('bracket_matchups')
              .select('id, team_a_id, team_b_id, is_bye, feeds_into_matchup_id')
              .eq('id', currentTargetId)
              .single();

            const targetMatchup: any = response.data;

            if (!targetMatchup) break;

            let field: 'team_a_id' | 'team_b_id' = 'team_a_id';
            if (targetMatchup.team_a_id && possibleReplacedTeams.includes(targetMatchup.team_a_id)) {
              field = 'team_a_id';
            } else if (targetMatchup.team_b_id && possibleReplacedTeams.includes(targetMatchup.team_b_id)) {
              field = 'team_b_id';
            } else {
              field = targetMatchup.team_a_id ? 'team_b_id' : 'team_a_id';
            }

            const payload: any = { [field]: teamId };

            if (targetMatchup.is_bye) {
              payload.winner_id = teamId;
              await supabase.from('bracket_matchups').update(payload).eq('id', targetMatchup.id);
              currentTargetId = targetMatchup.feeds_into_matchup_id;
            } else {
              await supabase.from('bracket_matchups').update(payload).eq('id', targetMatchup.id);
              break;
            }
          }
        }

        // 5. Advance winner to next round
        if (matchup.feeds_into_matchup_id && seriesWinnerId) {
          await propagateTeam(seriesWinnerId, matchup.feeds_into_matchup_id, matchupTeams);
        }

        // 6. Drop loser into Losers bracket (Double Elim)
        if (matchup.loser_feeds_into_matchup_id && seriesWinnerId) {
          const loserTeamId = matchup.team_a_id === seriesWinnerId ? matchup.team_b_id : matchup.team_a_id;
          if (loserTeamId) {
            await propagateTeam(loserTeamId, matchup.loser_feeds_into_matchup_id, matchupTeams);
          }
        }

        // 7. Grand Final: if Losers champion wins, create Bracket Reset match
        let isChampionDeclared = false;
        let finalLoserId = matchup.team_a_id === seriesWinnerId ? matchup.team_b_id : matchup.team_a_id;

        if (matchup.bracket_side === 'GRAND_FINAL') {
          if (matchup.round === 1) {
            const { data: previousMatches } = await supabase
              .from('bracket_matchups')
              .select('bracket_side, winner_id')
              .eq('feeds_into_matchup_id', matchup.id);

            let losersBracketChampWon = false;
            if (previousMatches) {
              const lbMatch = previousMatches.find(m => m.bracket_side === 'LOSERS');
              if (lbMatch && lbMatch.winner_id === seriesWinnerId) {
                losersBracketChampWon = true;
              }
            }

            if (losersBracketChampWon) {
              const { data: existingReset } = await supabase
                .from('bracket_matchups')
                .select('id')
                .eq('tournament_id', matchup.tournament_id)
                .eq('bracket_side', 'GRAND_FINAL')
                .eq('round', 2)
                .maybeSingle();

              if (!existingReset) {
                const loserTeamId = matchup.team_a_id === seriesWinnerId ? matchup.team_b_id : matchup.team_a_id;
                const resetInsertRes = await supabase.from('bracket_matchups').insert({
                  tournament_id: matchup.tournament_id,
                  round: 2,
                  slot: 1,
                  status: 'PENDING',
                  bracket_side: 'GRAND_FINAL',
                  team_a_id: seriesWinnerId,
                  team_b_id: loserTeamId,
                }).select('id').single();

                const resetMatch: any = resetInsertRes.data;
                if (resetMatch && matchup.tournament_id) {
                  await ensureScheduleForMatchup(supabase, matchup.tournament_id, resetMatch.id);
                }
              }
            } else {
              // Winners Bracket Champion won Round 1 -> They are the overall Champion!
              isChampionDeclared = true;
            }
          } else if (matchup.round === 2) {
             // Bracket Reset Match concluded -> Whoever wins this is the Champion!
             isChampionDeclared = true;
          }
        }

        // If it's single elimination and it's the final match
        if (!matchup.feeds_into_matchup_id && !matchup.loser_feeds_into_matchup_id && matchup.bracket_side !== 'GRAND_FINAL') {
          // If there is no next match, this might be the finals of a single elim
          isChampionDeclared = true;
        }

        if (isChampionDeclared) {
          // Check if championship already exists to avoid duplicates
          const { data: existingChamp } = await supabase
            .from('championships')
            .select('id')
            .eq('tournament_id', matchup.tournament_id)
            .maybeSingle();

          if (!existingChamp) {
            await supabase.from('championships').insert({
              tournament_id: matchup.tournament_id,
              champion_team_id: seriesWinnerId,
              runner_up_team_id: finalLoserId,
              final_series_id: game.series_id || null,
            });
            // Also mark tournament as completed
            await supabase.from('tournaments').update({ status: 'COMPLETED' }).eq('id', matchup.tournament_id);
          }
        }

        } // End of if (seriesCompleted && seriesWinnerId)

        revalidatePath('/bracket');
        revalidatePath('/admin/bracket');
        revalidatePath(`/tournaments/${matchup.tournament_id}`);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  revalidatePath('/admin/games');
  revalidatePath(`/admin/games/${input.gameId}`);
  revalidatePath('/schedule');
  revalidatePath('/teams');
  revalidatePath('/admin/stats');

  // Auto-recompute award candidate rankings from fresh stats
  await recomputeAwardCandidates();

  revalidatePath('/admin/awards');
}

export async function markGameLive(scheduleId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  await supabase.from('schedules').update({ status: 'LIVE' }).eq('id', scheduleId);
  await ensureGameForSchedule(scheduleId);

  revalidatePath('/schedule');
  revalidatePath('/admin/games');
}
