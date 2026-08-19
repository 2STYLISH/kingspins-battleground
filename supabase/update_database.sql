-- 1. Add missing columns to bracket_matchups (Double Elim)
ALTER TABLE bracket_matchups ADD COLUMN IF NOT EXISTS loser_feeds_into_matchup_id uuid references bracket_matchups(id);
ALTER TABLE bracket_matchups ADD COLUMN IF NOT EXISTS is_bye boolean not null default false;

-- 2. Update the unique constraint on bracket_matchups to include bracket_side (fixes the generate bracket crash)
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_tournament_id_round_slot_key;
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_tournament_id_round_slot_bracket_side_key;
ALTER TABLE bracket_matchups ADD CONSTRAINT bracket_matchups_tournament_id_round_slot_bracket_side_key UNIQUE (tournament_id, round, slot, bracket_side);

-- 3. Update bracket_side allowed values (fixes Round Robin crashes)
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_bracket_side_check;
ALTER TABLE bracket_matchups ADD CONSTRAINT bracket_matchups_bracket_side_check check (bracket_side in ('WINNERS', 'LOSERS', 'GRAND_FINAL', 'ROUND_ROBIN', 'SWISS', 'PLAY_IN'));

-- 4. Clean up any test KOTC tournaments before applying the new constraint
UPDATE tournaments SET format = 'DOUBLE_ELIM' WHERE format = 'KOTC';

-- 5. Update tournament formats allowed values (fixes creation of KOTC, Round Robin, etc)
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check check (format in ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS', 'FREE_FOR_ALL', 'LEADERBOARD', 'PLAYOFFS'));

-- 6. Add ON DELETE CASCADE to schedules table so tournaments can be deleted
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_tournament_id_fkey;
ALTER TABLE schedules ADD CONSTRAINT schedules_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- 7. Create team-logos storage bucket
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- 8. Storage policies for team-logos
create policy "team-logos_public_read" on storage.objects for select
  using ( bucket_id = 'team-logos' );

create policy "team-logos_admin_insert" on storage.objects for insert
  with check ( bucket_id = 'team-logos' and auth.uid() in (select id from public.profiles where role = 'ADMIN') );

create policy "team-logos_admin_update" on storage.objects for update
  using ( bucket_id = 'team-logos' and auth.uid() in (select id from public.profiles where role = 'ADMIN') );

-- 9. Add logo_url to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS logo_url text;

-- 10. Create tournament-logos storage bucket
insert into storage.buckets (id, name, public)
values ('tournament-logos', 'tournament-logos', true)
on conflict (id) do nothing;

-- 11. Storage policies for tournament-logos
create policy "tournament-logos_public_read" on storage.objects for select
  using ( bucket_id = 'tournament-logos' );

create policy "tournament-logos_admin_insert" on storage.objects for insert
  with check ( bucket_id = 'tournament-logos' and auth.uid() in (select id from public.profiles where role = 'ADMIN') );

create policy "tournament-logos_admin_update" on storage.objects for update
  using ( bucket_id = 'tournament-logos' and auth.uid() in (select id from public.profiles where role = 'ADMIN') );

-- 12. Create player-photos storage bucket
insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

-- 13. Storage policies for player-photos
create policy "player-photos_public_read" on storage.objects for select
  using ( bucket_id = 'player-photos' );

create policy "player-photos_admin_insert" on storage.objects for insert
  with check ( bucket_id = 'player-photos' and auth.uid() in (select id from public.profiles where role = 'ADMIN') );

create policy "player-photos_admin_update" on storage.objects for update
  using ( bucket_id = 'player-photos' and auth.uid() in (select id from public.profiles where role = 'ADMIN') );

-- 14. Update awards_award_type_check to match the new award types
-- First, remove any existing rows that violate the new types (like 'MVP' or old test data)
DELETE FROM awards WHERE award_type NOT IN ('BEST_PG', 'BEST_SG', 'BEST_SF', 'BEST_PF', 'BEST_CENTER', 'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY');

ALTER TABLE awards DROP CONSTRAINT IF EXISTS awards_award_type_check;
ALTER TABLE awards ADD CONSTRAINT awards_award_type_check check (
  award_type in ('BEST_PG', 'BEST_SG', 'BEST_SF', 'BEST_PF', 'BEST_CENTER', 'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY')
);

-- 15. Add manual stats to tournament_seeds
ALTER TABLE tournament_seeds ADD COLUMN IF NOT EXISTS manual_wins int;
ALTER TABLE tournament_seeds ADD COLUMN IF NOT EXISTS manual_losses int;
ALTER TABLE tournament_seeds ADD COLUMN IF NOT EXISTS point_differential int;

-- 16. Add is_archived to schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
