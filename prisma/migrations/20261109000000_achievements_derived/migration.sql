-- Achievements are no longer stored: they are derived from the matches (personal and team
-- achievements, see src/utils/achievements.ts), so nothing can drift out of sync when a
-- match is edited or deleted.
DROP TABLE "team_achievement";
