-- =========================================================
-- KINGPINS BATTLEGROUND — Clear All Data
-- Deletes ALL data from every table while preserving structure.
-- Run this in the Supabase SQL editor.
-- NOTE: profiles & seasons are NOT cleared so you don't lose
--       your admin account or active season. Remove those
--       comments if you want a completely blank slate.
-- =========================================================

-- Disable triggers temporarily to avoid FK conflicts
SET session_replication_role = 'replica';

-- Leaf tables first (no other tables reference them)
DELETE FROM award_votes;
DELETE FROM award_candidates;
DELETE FROM awards;
DELETE FROM championships;
DELETE FROM records;
DELETE FROM audit_logs;
DELETE FROM quarter_scores;
DELETE FROM player_game_stats;
DELETE FROM game_screenshots;
DELETE FROM games;
DELETE FROM schedules;
DELETE FROM series;
DELETE FROM bracket_matchups;
DELETE FROM tournament_seeds;
DELETE FROM tournament_rosters;
DELETE FROM tournaments;
-- DELETE FROM players;   -- uncomment to also wipe players
DELETE FROM teams;     -- uncomment to also wipe teams
-- DELETE FROM seasons;   -- uncomment to wipe seasons (will break active season ref)
-- DELETE FROM profiles;  -- ⚠️ DO NOT do this unless you want to lose your admin account

-- Re-enable triggers
SET session_replication_role = 'origin';
