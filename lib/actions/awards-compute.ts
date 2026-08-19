'use server';

import { createClient } from '@/lib/supabase/server';
import { averageStats, computeImpactRating, AWARD_WEIGHTS } from '@/lib/stats';
import type { AwardType, PlayerGameStats } from '@/lib/types';

const ALL_AWARD_TYPES: AwardType[] = [
  'BEST_PG', 'BEST_SG', 'BEST_SF', 'BEST_PF', 'BEST_CENTER',
  'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY',
];

/**
 * AWARD CANDIDATE RECOMPUTATION
 * ------------------------------
 * Called automatically after every game verification.
 * Reads ALL verified, non-DNP player_game_stats rows for the active season,
 * computes per-player averages and impact ratings, and upserts award_candidates.
 *
 * This only updates the RANKING — the actual winner is ALWAYS chosen manually by an admin.
 */
export async function recomputeAwardCandidates(): Promise<void> {
  const supabase = createClient();

  // Get active tournaments
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id')
    .in('status', ['SEEDING', 'IN_PROGRESS']);

  if (!tournaments || tournaments.length === 0) return;

  // Fetch all verified stats for players in games linked to these tournaments
  const { data: allStats } = await supabase
    .from('player_game_stats')
    .select(
      'player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, game:games!player_game_stats_game_id_fkey(id, home_team_id, away_team_id, home_score, away_score, schedule:schedules(tournament_id))'
    )
    .eq('is_verified', true)
    .eq('did_not_play', false);

  if (!allStats || allStats.length === 0) return;

  // We need to group candidates per tournament, so we do this for each active tournament
  for (const tournament of tournaments) {
    // Filter stats for this specific tournament
    const tStats = (allStats as any[]).filter(s => s.game?.schedule?.tournament_id === tournament.id);
    if (tStats.length === 0) continue;

    // Group stats by player_id for this tournament
    const byPlayer = new Map<string, { stats: PlayerGameStats[]; wins: number; gamesPlayed: number }>();

    for (const row of tStats) {
      if (!byPlayer.has(row.player_id)) {
        byPlayer.set(row.player_id, { stats: [], wins: 0, gamesPlayed: 0 });
      }
      const entry = byPlayer.get(row.player_id)!;
      entry.stats.push(row as PlayerGameStats);
      entry.gamesPlayed++;

      // Count wins
      const game = row.game;
      if (game && row.team_id) {
        const isHome = game.home_team_id === row.team_id;
        const teamScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;
        if (teamScore != null && oppScore != null && teamScore > oppScore) {
          entry.wins++;
        }
      }
    }

    // Rank players for THIS tournament
    let candidates = Array.from(byPlayer.entries()).map(([playerId, entry]) => {
      return { playerId, entry };
    });

    // Ensure award rows exist for THIS tournament (upsert)
    for (const awardType of ALL_AWARD_TYPES) {
      const { data: existingAward } = await supabase
        .from('awards')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('award_type', awardType)
        .maybeSingle();

      let awardId: string;

      if (!existingAward) {
        const { data: created, error } = await supabase
          .from('awards')
          .insert({ tournament_id: tournament.id, award_type: awardType, status: 'DRAFT' })
          .select('id')
          .single();
        if (error || !created) continue;
        awardId = created.id;
      } else {
        awardId = existingAward.id;
      }

      // Compute impact rating for every player who has played
      const weights = AWARD_WEIGHTS[awardType] ?? {};
      const rankings = candidates.map(({ playerId, entry }) => {
        const avg = averageStats(entry.stats, entry.wins, entry.gamesPlayed);
        const rating = computeImpactRating(avg, weights);
        return { player_id: playerId, rating, avg };
      });

      // Sort by rating descending
      rankings.sort((a, b) => b.rating - a.rating);

      const inserts = rankings.map((r, i) => ({
        award_id: awardId,
        player_id: r.player_id,
        rank: i + 1,
        computed_rating: r.rating,
        stat_snapshot: {
          ppg: r.avg.ppg,
          rpg: r.avg.rpg,
          apg: r.avg.apg,
          spg: r.avg.spg,
          bpg: r.avg.bpg,
          fgPct: r.avg.fgPct,
          tpPct: r.avg.tpPct,
          ftPct: r.avg.ftPct,
          winPct: r.avg.winPct,
          gamesPlayed: r.avg.gamesPlayed,
        },
      }));

      // Clear existing candidates for this award
      await supabase.from('award_candidates').delete().eq('award_id', awardId);

      // Re-insert top N candidates for this tournament award
      if (inserts.length > 0) {
        await supabase.from('award_candidates').insert(inserts);
      }
    }
  }
}
