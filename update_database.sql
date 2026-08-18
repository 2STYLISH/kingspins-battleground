-- 1. Add missing columns to bracket_matchups (Double Elim)
ALTER TABLE bracket_matchups ADD COLUMN IF NOT EXISTS loser_feeds_into_matchup_id uuid references bracket_matchups(id);
ALTER TABLE bracket_matchups ADD COLUMN IF NOT EXISTS is_bye boolean not null default false;

-- 2. Update the unique constraint on bracket_matchups to include bracket_side (fixes the generate bracket crash)
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_tournament_id_round_slot_key;
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_tournament_id_round_slot_bracket_side_key;
ALTER TABLE bracket_matchups ADD CONSTRAINT bracket_matchups_tournament_id_round_slot_bracket_side_key UNIQUE (tournament_id, round, slot, bracket_side);

-- 3. Update bracket_side allowed values (fixes Round Robin crashes)
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_bracket_side_check;
ALTER TABLE bracket_matchups ADD CONSTRAINT bracket_matchups_bracket_side_check check (bracket_side in ('WINNERS', 'LOSERS', 'GRAND_FINAL', 'ROUND_ROBIN'));

-- 4. Clean up any test KOTC tournaments before applying the new constraint
UPDATE tournaments SET format = 'DOUBLE_ELIM' WHERE format = 'KOTC';

-- 5. Update tournament formats allowed values (fixes creation of KOTC, Round Robin, etc)
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check check (format in ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS', 'FREE_FOR_ALL', 'LEADERBOARD'));

-- 6. Add ON DELETE CASCADE to schedules table so tournaments can be deleted
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_tournament_id_fkey;
ALTER TABLE schedules ADD CONSTRAINT schedules_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
