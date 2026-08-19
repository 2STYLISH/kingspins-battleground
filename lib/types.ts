export type AwardType =
  | 'BEST_PG'
  | 'BEST_SG'
  | 'BEST_SF'
  | 'BEST_PF'
  | 'BEST_CENTER'
  | 'FINALS_MVP'
  | 'OVERALL_MVP'
  | 'OVERALL_DPOY';

export type AwardStatus = 'DRAFT' | 'UNDER_REVIEW' | 'FINALIZED' | 'PUBLISHED';

export type GameStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'AWAITING_STATS'
  | 'STATS_UNDER_REVIEW'
  | 'VERIFIED'
  | 'COMPLETED';

export type ScheduleStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
export type GameType = 'REGULAR' | 'PLAYOFF' | 'TOURNAMENT' | 'EXHIBITION';
export type MatchFormat = 'BO1' | 'BO3' | 'BO5' | 'BO7';
export type TournamentFormat = 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'ROUND_ROBIN' | 'LEADERBOARD' | 'SWISS' | 'PLAYOFFS';
export type BracketMatchupStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Team {
  id: string;
  name: string;
  short_name?: string | null;
  logo_path?: string | null;
}

export interface Player {
  id: string;
  gamertag: string;
  position?: string | null;
  photo_path?: string | null;
}

export interface PlayerGameStats {
  id: string;
  game_id: string;
  player_id: string;
  team_id: string;
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
  did_not_play: boolean;
  is_verified: boolean;
  position?: string;
}

export interface AveragedStatLine {
  gamesPlayed: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fgPct: number;
  tpPct: number;
  ftPct: number;
  winPct: number;
}

export interface AwardCandidate {
  player_id: string;
  gamertag: string;
  rank: number;
  computedRating: number;
  stats: AveragedStatLine;
}

export interface BracketMatchup {
  id: string;
  tournament_id: string;
  round: number;
  slot: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  feeds_into_matchup_id: string | null;
  status: BracketMatchupStatus;
}

// Structured result the AI/OCR screenshot parser must return.
// Kept provider-agnostic — any AI backend must map its output to this shape.
export interface ScreenshotExtractionResult {
  teams: { name: string; score: number }[];
  players: {
    gamertag: string;
    team: string;
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
  }[];
  quarterScores: { quarter: number; home: number; away: number }[];
  confidence: number; // 0–1, how confident the parser is in this extraction
}
