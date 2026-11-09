import { prisma } from "~/server/prisma";
import { dataVersion } from "~/server/db";
import {
  achievementPoints,
  computeAchievements,
  Earned,
} from "~/utils/achievements";

let cache: { key: string; earned: Earned[] } | null = null;

/**
 * Everything every player and pair has earned, derived from all matches (see
 * `computeAchievements`). Kept until the next write; the cheap fingerprint of the match
 * table also catches changes made by another process (e.g. the demo seed script).
 */
export async function getEarned(): Promise<Earned[]> {
  const f = await prisma.match.aggregate({
    _count: { _all: true },
    _max: { id: true },
    _sum: { score1: true, score2: true, team1Rating: true, team2Rating: true },
  });
  const key = [
    dataVersion(),
    f._count._all,
    f._max.id,
    f._sum.score1,
    f._sum.score2,
    f._sum.team1Rating,
    f._sum.team2Rating,
  ].join("|");
  if (cache?.key === key) return cache.earned;

  const matches = await prisma.match.findMany({
    select: {
      id: true,
      createdAt: true,
      season: true,
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
  const earned = computeAchievements(matches);
  cache = { key, earned };
  return earned;
}

/** A player's (key) or a team's (name) earned achievements, oldest first. */
export async function earnedBy(scope: "player" | "team", subject: string) {
  return (await getEarned()).filter(
    e => e.scope === scope && e.subject === subject,
  );
}

/** Points of every player (by key), all time. */
export async function playerPoints(): Promise<Map<string, number>> {
  const bySubject = new Map<string, Earned[]>();
  for (const e of await getEarned()) {
    if (e.scope !== "player") continue;
    bySubject.set(e.subject, [...(bySubject.get(e.subject) ?? []), e]);
  }
  return new Map(
    [...bySubject].map(([key, list]) => [key, achievementPoints(list)]),
  );
}

/** What each match earned, by match id, for the 🏅 next to a match. */
export async function earnedByMatch(matchIds: number[]) {
  const wanted = new Set(matchIds);
  const byMatch = new Map<
    number,
    Array<Pick<Earned, "scope" | "subject" | "achievement">>
  >();
  for (const e of await getEarned()) {
    if (!wanted.has(e.matchId)) continue;
    const list = byMatch.get(e.matchId) ?? [];
    list.push({
      scope: e.scope,
      subject: e.subject,
      achievement: e.achievement,
    });
    byMatch.set(e.matchId, list);
  }
  return byMatch;
}

/** Adds `achievements` (what each match earned) to a list of matches. */
export async function withAchievements<T extends { id: number }>(matches: T[]) {
  const byMatch = await earnedByMatch(matches.map(m => m.id));
  return matches.map(m => ({ ...m, achievements: byMatch.get(m.id) ?? [] }));
}
