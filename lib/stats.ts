import type { AveragedStatLine, PlayerGameStats } from './types';

/**
 * STATISTICS ENGINE
 * ------------------
 * Deterministic, pure application-layer math. AI is only ever used to read
 * numbers off a screenshot (see lib/services/screenshot-parser.ts) — once an
 * admin verifies a game's stats, everything below runs on plain arithmetic
 * over `player_game_stats` rows. Nothing here calls an AI provider.
 */

export function averageStats(rows: PlayerGameStats[], wins: number, gamesPlayed: number): AveragedStatLine {
  const g = rows.length || 1;
  const sum = rows.reduce(
    (acc, r) => {
      acc.pts += r.pts;
      acc.reb += r.reb;
      acc.ast += r.ast;
      acc.stl += r.stl;
      acc.blk += r.blk;
      acc.fgm += r.fgm;
      acc.fga += r.fga;
      acc.tpm += r.tpm;
      acc.tpa += r.tpa;
      acc.ftm += r.ftm;
      acc.fta += r.fta;
      return acc;
    },
    { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 }
  );

  return {
    gamesPlayed: rows.length,
    ppg: round1(sum.pts / g),
    rpg: round1(sum.reb / g),
    apg: round1(sum.ast / g),
    spg: round1(sum.stl / g),
    bpg: round1(sum.blk / g),
    fgPct: pct(sum.fgm, sum.fga),
    tpPct: pct(sum.tpm, sum.tpa),
    ftPct: pct(sum.ftm, sum.fta),
    winPct: gamesPlayed > 0 ? round1((wins / gamesPlayed) * 100) : 0,
  };
}

function pct(made: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return round1((made / attempted) * 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * AWARD CANDIDATE RATING
 * -----------------------
 * A single weighted "impact rating" used purely to RANK candidates for an
 * admin to review. This number NEVER decides an award on its own — see
 * RULE 5 / RULE 6: admins always make the final manual selection.
 *
 * Weights are intentionally simple and tunable per award type.
 */
export function computeImpactRating(
  s: AveragedStatLine,
  weights: Partial<Record<keyof AveragedStatLine, number>> = {}
): number {
  const w = {
    ppg: 1.0,
    rpg: 1.0,
    apg: 1.2,
    spg: 1.5,
    bpg: 1.5,
    fgPct: 0.15,
    tpPct: 0.05,
    ftPct: 0.05,
    winPct: 0.25,
    gamesPlayed: 0,
    ...weights,
  };

  const rating =
    s.ppg * w.ppg +
    s.rpg * w.rpg +
    s.apg * w.apg +
    s.spg * w.spg +
    s.bpg * w.bpg +
    s.fgPct * w.fgPct +
    s.tpPct * w.tpPct +
    s.ftPct * w.ftPct +
    s.winPct * w.winPct;

  return Math.round(rating * 10) / 10;
}

// Award-specific candidate weighting presets — still just a ranking aid.
export const AWARD_WEIGHTS: Record<string, Partial<Record<keyof AveragedStatLine, number>>> = {
  BEST_PG: { ppg: 1.0, apg: 1.4, spg: 1.2 },
  BEST_SG: { ppg: 1.2, apg: 1.0, spg: 1.0 },
  BEST_SF: { ppg: 1.0, rpg: 1.0, apg: 1.0 },
  BEST_PF: { rpg: 1.4, ppg: 0.8, bpg: 1.0 },
  BEST_CENTER: { rpg: 1.5, bpg: 1.5, ppg: 0.5 },
  FINALS_MVP: { ppg: 1.0, apg: 1.0, rpg: 1.0, winPct: 0.5 },
  OVERALL_MVP: { ppg: 1.0, apg: 1.2, winPct: 0.35 },
  OVERALL_DPOY: { spg: 2.0, bpg: 2.0, rpg: 0.6, ppg: 0.2, winPct: 0.15 },
};
