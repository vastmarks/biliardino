import { Prisma } from "@prisma/client";
import type { Db } from "~/server/db";
import { getTeamSize } from "~/model";
import { achievements as allAchievements } from "~/utils/achievements";
import {
  emptyTeamNumbers,
  fromMeta,
  replaySeason,
  TeamNumbers,
  toMetaData,
} from "~/utils/teamStats";

export const teamWithMeta = Prisma.validator<Prisma.TeamDefaultArgs>()({
  include: { meta: true },
});
export type TeamWithMeta = Prisma.TeamGetPayload<typeof teamWithMeta>;

export const teamWithAchievements = Prisma.validator<Prisma.TeamDefaultArgs>()({
  include: { achievements: true },
});
export type TeamWithAchievements = Prisma.TeamGetPayload<
  typeof teamWithAchievements
>;

export type TeamWithMetaAndAchievements = TeamWithMeta & TeamWithAchievements;

/** The team with this canonical name (see `teamNameFromKeys`); created on first use. */
export async function getOrCreateTeam(
  db: Db,
  name: string,
): Promise<TeamWithMetaAndAchievements> {
  return db.team.upsert({
    where: { name },
    include: { meta: true, achievements: true },
    update: {},
    create: { name, teamsize: getTeamSize(name) },
  });
}

/** Current numbers of a team in a season (fresh numbers if it hasn't played yet). */
export function teamNumbers(team: TeamWithMeta, season: number): TeamNumbers {
  const meta = team.meta.find(m => m.season === season);
  return meta ? fromMeta(meta, meta.totalMatches > 0) : emptyTeamNumbers();
}

/** Stores new numbers and keeps the in-memory `team.meta` in sync (achievements read it). */
export async function saveTeamNumbers(
  db: Db,
  team: TeamWithMeta,
  season: number,
  numbers: TeamNumbers,
) {
  const data = toMetaData(numbers);
  const meta = await db.teamMeta.upsert({
    where: { season_teamId: { season, teamId: team.id } },
    create: { ...data, season, teamId: team.id },
    update: data,
  });
  team.meta = [...team.meta.filter(m => m.season !== season), meta];
  return meta;
}

const pointsOf = (achievementId: string) =>
  allAchievements.find(a => a.id === achievementId)?.points ?? 0;

/**
 * Deletes a team with all its matches and achievements, then recalculates every season it
 * played in (its opponents' ratings change too).
 */
export async function deleteTeamCascade(
  db: Db,
  team: { id: number; name: string },
) {
  const where = { OR: [{ team1: team.name }, { team2: team.name }] };
  const seasons = await db.match.findMany({
    where,
    select: { season: true },
    distinct: ["season"],
  });
  await db.match.deleteMany({ where });
  await db.team.delete({ where: { id: team.id } });
  for (const { season } of seasons) {
    await rebuildSeason(db, season);
  }
}

/**
 * Recomputes every team's numbers and every match's ratings of a season from its matches.
 * Used after deleting matches, teams or achievements, so nothing can drift out of sync.
 */
export async function rebuildSeason(db: Db, season: number) {
  const matches = await db.match.findMany({
    where: { season },
    select: {
      id: true,
      createdAt: true,
      team1: true,
      team2: true,
      score1: true,
      score2: true,
      team1Rating: true,
      team2Rating: true,
      team1RatingChange: true,
      team2RatingChange: true,
    },
  });
  const replay = replaySeason(matches);

  const differs = (a: number, b: number) => Math.abs(a - b) > 1e-9;
  for (const m of matches) {
    const r = replay.matches.get(m.id)!;
    if (
      differs(m.team1Rating, r.team1Rating) ||
      differs(m.team2Rating, r.team2Rating) ||
      differs(m.team1RatingChange, r.team1RatingChange) ||
      differs(m.team2RatingChange, r.team2RatingChange)
    ) {
      await db.match.update({ where: { id: m.id }, data: r });
    }
  }

  const earned = await db.teamAchievement.findMany({
    where: { season },
    select: { teamId: true, achievement: true },
  });
  const points = new Map<number, number>();
  for (const a of earned) {
    points.set(a.teamId, (points.get(a.teamId) ?? 0) + pointsOf(a.achievement));
  }

  // an edited match can put a team into a season where it has no stats row yet
  const existing = new Set(
    (
      await db.teamMeta.findMany({
        where: { season },
        select: { team: { select: { name: true } } },
      })
    ).map(m => m.team.name),
  );
  for (const name of replay.teams.keys()) {
    if (!existing.has(name)) {
      const team = await getOrCreateTeam(db, name);
      await saveTeamNumbers(db, team, season, emptyTeamNumbers());
    }
  }

  const metas = await db.teamMeta.findMany({
    where: { season },
    include: { team: { select: { name: true } } },
  });
  for (const meta of metas) {
    const numbers = replay.teams.get(meta.team.name) ?? emptyTeamNumbers();
    await db.teamMeta.update({
      where: { id: meta.id },
      data: {
        ...toMetaData(numbers),
        // a team without matches keeps its old date instead of "now"
        ...(numbers.lastMatchAt ? {} : { updatedAt: meta.createdAt }),
        achievementPoints: points.get(meta.teamId) ?? 0,
      },
    });
  }
}
