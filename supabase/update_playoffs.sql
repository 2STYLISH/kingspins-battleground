-- 1. Update tournament formats allowed values to include PLAYOFFS
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check check (format in ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS', 'FREE_FOR_ALL', 'LEADERBOARD', 'PLAYOFFS'));

-- 2. Update bracket_side allowed values to include PLAY_IN
ALTER TABLE bracket_matchups DROP CONSTRAINT IF EXISTS bracket_matchups_bracket_side_check;
ALTER TABLE bracket_matchups ADD CONSTRAINT bracket_matchups_bracket_side_check check (bracket_side in ('WINNERS', 'LOSERS', 'GRAND_FINAL', 'ROUND_ROBIN', 'SWISS', 'PLAY_IN'));
