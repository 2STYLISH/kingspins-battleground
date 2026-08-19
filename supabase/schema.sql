-- =========================================================
-- KINGPINS BATTLEGROUND — Supabase schema
-- NBA 2K league management: stats, brackets, schedules, awards
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- ROLE HELPER
-- Admins are flagged in profiles.role. auth.uid() drives RLS.
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'PUBLIC' check (role in ('ADMIN', 'PUBLIC')),
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- ---------------------------------------------------------
-- CORE ENTITIES
-- ---------------------------------------------------------
create table if not exists seasons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,               -- e.g. "Season 1"
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  name text not null,
  short_name text,
  logo_path text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  gamertag text not null,
  position text,                    -- Guard / Big / Wing etc
  photo_path text,
  tier int check (tier between 1 and 6),
  bio text,
  slug text unique generated always as (lower(regexp_replace(gamertag, '[^a-zA-Z0-9_]', '', 'g'))) stored,
  created_at timestamptz not null default now()
);

create table if not exists tournaments (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id) on delete cascade,
  name text not null,
  format text not null check (format in ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS', 'FREE_FOR_ALL', 'LEADERBOARD')),
  num_teams int not null,
  match_format text not null check (match_format in ('BO1', 'BO3', 'BO5', 'BO7')),
  start_date date,
  end_date date,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SEEDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists tournament_seeds (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  seed int not null,
  unique (tournament_id, seed),
  unique (tournament_id, team_id)
);

-- Roster mapping: players are assigned to teams per-tournament.
create table if not exists tournament_rosters (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tournament_id, player_id) -- A player can only be on one team per tournament
);

-- Bracket structure: each row is one matchup slot in the tree.
create table if not exists bracket_matchups (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  round int not null,               -- 1 = first round
  slot int not null,                -- position within the round
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  winner_id uuid references teams(id),
  feeds_into_matchup_id uuid references bracket_matchups(id),
  loser_feeds_into_matchup_id uuid references bracket_matchups(id),
  is_bye boolean not null default false,
  bracket_side text default 'WINNERS' check (bracket_side in ('WINNERS', 'LOSERS', 'GRAND_FINAL', 'ROUND_ROBIN', 'SWISS')),
  status text not null default 'PENDING' check (status in ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
  created_at timestamptz not null default now(),
  unique (tournament_id, round, slot, bracket_side)
);

create table if not exists series (
  id uuid primary key default uuid_generate_v4(),
  bracket_matchup_id uuid references bracket_matchups(id) on delete cascade,
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  match_format text not null check (match_format in ('BO1', 'BO3', 'BO5', 'BO7')),
  team_a_wins int not null default 0,
  team_b_wins int not null default 0,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED')),
  winner_id uuid references teams(id),
  created_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default uuid_generate_v4(),
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  season_id uuid references seasons(id),
  tournament_id uuid references tournaments(id) on delete cascade,
  series_id uuid references series(id),
  game_type text not null check (game_type in ('REGULAR', 'PLAYOFF', 'TOURNAMENT', 'EXHIBITION')),
  round_label text,                 -- "Semifinal", "Game 3" etc
  scheduled_date date not null,
  scheduled_time time not null,
  timezone text not null default 'Asia/Manila',
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED')),
  created_at timestamptz not null default now()
);

-- Links a bracket matchup to the schedules row auto-created for it once both
-- sides are filled in (seeding, or a winner advancing into the next round).
-- Added as a post-hoc alter (rather than inline on bracket_matchups above)
-- since `schedules` doesn't exist yet at that point in the file, and this
-- form is safe to re-run against a database that was already created before
-- this column existed.
alter table bracket_matchups add column if not exists schedule_id uuid references schedules(id);

create table if not exists games (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid references schedules(id) on delete set null,
  series_id uuid references series(id) on delete set null,
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  home_score int,
  away_score int,
  status text not null default 'SCHEDULED' check (
    status in ('SCHEDULED', 'LIVE', 'AWAITING_STATS', 'STATS_UNDER_REVIEW', 'VERIFIED', 'COMPLETED')
  ),
  played_at timestamptz,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists quarter_scores (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  quarter int not null,
  home_points int not null default 0,
  away_points int not null default 0
);

-- Screenshot evidence, stored in Supabase Storage — only the path/metadata live here.
create table if not exists game_screenshots (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  storage_path text not null,       -- e.g. game-screenshots/season-1/game-001/final.jpg
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  ai_extraction jsonb,              -- raw structured result from screenshot-parser
  ai_confidence numeric
);

create table if not exists player_game_stats (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  team_id uuid references teams(id),
  pts int not null default 0,
  reb int not null default 0,
  ast int not null default 0,
  stl int not null default 0,
  blk int not null default 0,
  fgm int not null default 0,
  fga int not null default 0,
  tpm int not null default 0,
  tpa int not null default 0,
  ftm int not null default 0,
  fta int not null default 0,
  fouls int not null default 0,
  turnovers int not null default 0,
  did_not_play boolean not null default false,  -- DNP players excluded from averages/awards
  is_verified boolean not null default false,
  unique (game_id, player_id)
);

-- ---------------------------------------------------------
-- AWARDS — statistics can rank candidates, admins decide, admins publish.
-- ---------------------------------------------------------
create table if not exists awards (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  award_type text not null check (
    award_type in ('BEST_PG', 'BEST_SG', 'BEST_SF', 'BEST_PF', 'BEST_CENTER', 'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY')
  ),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'UNDER_REVIEW', 'FINALIZED', 'PUBLISHED')),
  winner_player_id uuid references players(id),
  admin_notes text,
  publish_notes boolean not null default false,
  finalized_by uuid references profiles(id),
  finalized_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_awards_season_type on awards(season_id, award_type) where tournament_id is null;
create unique index if not exists idx_awards_tournament_type on awards(tournament_id, award_type) where tournament_id is not null;

-- Statistically-ranked candidates — recommendation only, never auto-decides a winner.
create table if not exists award_candidates (
  id uuid primary key default uuid_generate_v4(),
  award_id uuid references awards(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  rank int not null,
  computed_rating numeric not null,
  stat_snapshot jsonb not null,     -- PPG/RPG/APG/etc at time of computation
  unique (award_id, player_id)
);

-- Optional internal admin voting — a recommendation, never auto-selects the winner.
create table if not exists award_votes (
  id uuid primary key default uuid_generate_v4(),
  award_id uuid references awards(id) on delete cascade,
  admin_id uuid references profiles(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (award_id, admin_id)
);

-- ---------------------------------------------------------
-- RECORDS & CHAMPIONSHIPS
-- ---------------------------------------------------------
create table if not exists records (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id),
  record_type text not null,        -- e.g. "MOST_PTS_GAME"
  player_id uuid references players(id),
  team_id uuid references teams(id),
  value numeric not null,
  game_id uuid references games(id),
  created_at timestamptz not null default now()
);

create table if not exists championships (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  champion_team_id uuid references teams(id),
  runner_up_team_id uuid references teams(id),
  final_series_id uuid references series(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- AUDIT LOG — every manual override is recorded.
-- ---------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references profiles(id),
  action text not null,             -- e.g. "BRACKET_OVERRIDE", "AWARD_PUBLISHED"
  target_type text not null,        -- "bracket_matchup", "award", "game", etc
  target_id uuid,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================
create index if not exists idx_players_team on players(team_id);
create index if not exists idx_games_status on games(status);
create index if not exists idx_schedules_date on schedules(scheduled_date);
create index if not exists idx_pgs_player on player_game_stats(player_id);
create index if not exists idx_pgs_game on player_game_stats(game_id);
create index if not exists idx_bracket_tournament on bracket_matchups(tournament_id);
create index if not exists idx_award_candidates_award on award_candidates(award_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- Public: read published/verified data only.
-- Admin: full read/write via is_admin().
-- =========================================================
alter table profiles enable row level security;
alter table seasons enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table tournaments enable row level security;
alter table tournament_seeds enable row level security;
alter table tournament_rosters enable row level security;
alter table bracket_matchups enable row level security;
alter table series enable row level security;
alter table schedules enable row level security;
alter table games enable row level security;
alter table quarter_scores enable row level security;
alter table game_screenshots enable row level security;
alter table player_game_stats enable row level security;
alter table awards enable row level security;
alter table award_candidates enable row level security;
alter table award_votes enable row level security;
alter table records enable row level security;
alter table championships enable row level security;
alter table audit_logs enable row level security;

-- profiles: users can read their own row; admins can read all.
drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles for select using (auth.uid() = id or is_admin());
drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write" on profiles for all using (is_admin()) with check (is_admin());

-- Public reference data: seasons, teams, players — publicly readable, admin writable.
drop policy if exists "seasons_public_read" on seasons;
create policy "seasons_public_read" on seasons for select using (true);
drop policy if exists "seasons_admin_write" on seasons;
create policy "seasons_admin_write" on seasons for all using (is_admin()) with check (is_admin());

drop policy if exists "teams_public_read" on teams;
create policy "teams_public_read" on teams for select using (true);
drop policy if exists "teams_admin_write" on teams;
create policy "teams_admin_write" on teams for all using (is_admin()) with check (is_admin());

drop policy if exists "players_public_read" on players;
create policy "players_public_read" on players for select using (true);
drop policy if exists "players_admin_write" on players;
create policy "players_admin_write" on players for all using (is_admin()) with check (is_admin());

drop policy if exists "tournaments_public_read" on tournaments;
create policy "tournaments_public_read" on tournaments for select using (true);
drop policy if exists "tournaments_admin_write" on tournaments;
create policy "tournaments_admin_write" on tournaments for all using (is_admin()) with check (is_admin());

drop policy if exists "seeds_public_read" on tournament_seeds;
create policy "seeds_public_read" on tournament_seeds for select using (true);
drop policy if exists "seeds_admin_write" on tournament_seeds;
create policy "seeds_admin_write" on tournament_seeds for all using (is_admin()) with check (is_admin());

drop policy if exists "rosters_public_read" on tournament_rosters;
create policy "rosters_public_read" on tournament_rosters for select using (true);
drop policy if exists "rosters_admin_write" on tournament_rosters;
create policy "rosters_admin_write" on tournament_rosters for all using (is_admin()) with check (is_admin());

drop policy if exists "bracket_public_read" on bracket_matchups;
create policy "bracket_public_read" on bracket_matchups for select using (true);
drop policy if exists "bracket_admin_write" on bracket_matchups;
create policy "bracket_admin_write" on bracket_matchups for all using (is_admin()) with check (is_admin());

drop policy if exists "series_public_read" on series;
create policy "series_public_read" on series for select using (true);
drop policy if exists "series_admin_write" on series;
create policy "series_admin_write" on series for all using (is_admin()) with check (is_admin());

drop policy if exists "schedules_public_read" on schedules;
create policy "schedules_public_read" on schedules for select using (true);
drop policy if exists "schedules_admin_write" on schedules;
create policy "schedules_admin_write" on schedules for all using (is_admin()) with check (is_admin());

-- games: public can only see VERIFIED/COMPLETED games; admins see everything.
drop policy if exists "games_public_read_verified" on games;
create policy "games_public_read_verified" on games for select
  using (status in ('VERIFIED', 'COMPLETED') or is_admin());
drop policy if exists "games_admin_write" on games;
create policy "games_admin_write" on games for all using (is_admin()) with check (is_admin());

drop policy if exists "quarter_scores_public_read" on quarter_scores;
create policy "quarter_scores_public_read" on quarter_scores for select
  using (exists (select 1 from games g where g.id = game_id and (g.status in ('VERIFIED','COMPLETED') or is_admin())));
drop policy if exists "quarter_scores_admin_write" on quarter_scores;
create policy "quarter_scores_admin_write" on quarter_scores for all using (is_admin()) with check (is_admin());

-- screenshots: admin-only, never public (raw evidence + AI extraction may be uncorrected).
drop policy if exists "screenshots_admin_only" on game_screenshots;
create policy "screenshots_admin_only" on game_screenshots for all using (is_admin()) with check (is_admin());

-- player_game_stats: public can only see verified stats; admins see everything.
drop policy if exists "pgs_public_read_verified" on player_game_stats;
create policy "pgs_public_read_verified" on player_game_stats for select
  using (is_verified = true or is_admin());
drop policy if exists "pgs_admin_write" on player_game_stats;
create policy "pgs_admin_write" on player_game_stats for all using (is_admin()) with check (is_admin());

-- awards: public can only see PUBLISHED awards; admins see everything.
drop policy if exists "awards_public_read_published" on awards;
create policy "awards_public_read_published" on awards for select
  using (status = 'PUBLISHED' or is_admin());
drop policy if exists "awards_admin_write" on awards;
create policy "awards_admin_write" on awards for all using (is_admin()) with check (is_admin());

-- award_candidates & votes: admin-only (internal deliberation, never public).
drop policy if exists "award_candidates_admin_only" on award_candidates;
create policy "award_candidates_admin_only" on award_candidates for all using (is_admin()) with check (is_admin());
drop policy if exists "award_votes_admin_only" on award_votes;
create policy "award_votes_admin_only" on award_votes for all using (is_admin()) with check (is_admin());

drop policy if exists "records_public_read" on records;
create policy "records_public_read" on records for select using (true);
drop policy if exists "records_admin_write" on records;
create policy "records_admin_write" on records for all using (is_admin()) with check (is_admin());

drop policy if exists "championships_public_read" on championships;
create policy "championships_public_read" on championships for select using (true);
drop policy if exists "championships_admin_write" on championships;
create policy "championships_admin_write" on championships for all using (is_admin()) with check (is_admin());

-- audit_logs: admin-only.
drop policy if exists "audit_logs_admin_only" on audit_logs;
create policy "audit_logs_admin_only" on audit_logs for all using (is_admin()) with check (is_admin());

-- =========================================================
-- GUARDRAIL: an award can only move to PUBLISHED from FINALIZED,
-- and only FINALIZED awards can be published. This enforces
-- "no automatic finalization/publishing" at the database level.
-- =========================================================
create or replace function enforce_award_status_flow()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'PUBLISHED' and old.status <> 'FINALIZED' then
    raise exception 'Awards can only be published from FINALIZED status (admin must finalize first)';
  end if;
  if new.status = 'FINALIZED' and new.winner_player_id is null then
    raise exception 'Cannot finalize an award without a manually selected winner_player_id';
  end if;
  if new.status = 'PUBLISHED' and old.status <> 'PUBLISHED' then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_status_flow on awards;
create trigger trg_award_status_flow
  before update on awards
  for each row execute function enforce_award_status_flow();

-- =========================================================
-- STORAGE BUCKET for screenshot evidence.
-- Kept private — only admins (via the service-role client) read/write it.
-- Public users never get a direct URL into this bucket.
-- =========================================================
insert into storage.buckets (id, name, public)
values ('game-screenshots', 'game-screenshots', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tournament-logos', 'tournament-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;
