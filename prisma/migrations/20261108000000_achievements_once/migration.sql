-- Achievements are earned once per team, ever (they used to be earned again every season).
-- Keep only the first time each team earned each achievement.
DELETE FROM "team_achievement"
WHERE EXISTS (
  SELECT 1 FROM "team_achievement" AS earlier
  WHERE earlier."teamId" = "team_achievement"."teamId"
    AND earlier."achievement" = "team_achievement"."achievement"
    AND (earlier."createdAt" < "team_achievement"."createdAt"
      OR (earlier."createdAt" = "team_achievement"."createdAt" AND earlier."id" < "team_achievement"."id"))
);

-- Achievement points are now added up from the achievements themselves, for all seasons.
ALTER TABLE "team_meta" DROP COLUMN "achievementPoints";
