import { prisma } from "~/server/prisma";
import { getCurrentSeason } from "~/server/model/season";
import {
  computeDashboard,
  DashboardStats,
  PairRow,
  recentPlayerOrder,
  topPairs,
} from "~/utils/dashboard";

export interface DashboardRecentMatch {
  id: number;
  createdAt: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  comment: string;
  team1RatingChange: number;
  team2RatingChange: number;
  achievements: Array<{ teamName: string; achievement: string }>;
}

export interface DashboardData extends DashboardStats {
  season: number;
  /** all defined players, most recently active first, then alphabetical */
  roster: Array<{ id: number; key: string; name: string }>;
  pairs: PairRow[];
  recent: DashboardRecentMatch[];
  totalMatches: number;
}

/** Local (server time zone) midnight, `daysAgo` days back. DST-safe. */
export function startOfDay(now: Date, daysAgo = 0): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
}

export async function loadDashboard(
  seasonInput?: number,
  now = new Date(),
): Promise<DashboardData> {
  const season = seasonInput ?? (await getCurrentSeason());

  const [matches, players, teams, recent] = await Promise.all([
    prisma.match.findMany({
      where: { season },
      select: {
        id: true,
        createdAt: true,
        team1: true,
        team2: true,
        score1: true,
        score2: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.player.findMany({ select: { id: true, key: true, name: true } }),
    prisma.team.findMany({
      where: { teamsize: 2 },
      select: {
        name: true,
        teamsize: true,
        meta: {
          where: { season },
          select: {
            season: true,
            rating: true,
            totalMatches: true,
            totalWins: true,
            totalLosses: true,
          },
        },
      },
    }),
    prisma.match.findMany({
      where: { season },
      take: 8,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        achievements: { select: { teamName: true, achievement: true } },
      },
    }),
  ]);

  const stats = computeDashboard(matches, {
    today: startOfDay(now),
    week: startOfDay(now, 6),
    month: startOfDay(now, 29),
  });

  // roster: recent players first (across all seasons would need more data; the season is enough)
  const order = recentPlayerOrder([...matches].reverse());
  const rank = new Map(order.map((k, i) => [k, i]));
  const roster = [...players].sort(
    (a, b) =>
      (rank.get(a.key) ?? Infinity) - (rank.get(b.key) ?? Infinity) ||
      a.name.localeCompare(b.name),
  );

  return {
    season,
    ...stats,
    roster,
    pairs: topPairs(teams, season),
    totalMatches: matches.length,
    recent: recent.map(m => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      team1: m.team1,
      team2: m.team2,
      score1: m.score1,
      score2: m.score2,
      comment: m.comment,
      team1RatingChange: m.team1RatingChange,
      team2RatingChange: m.team2RatingChange,
      achievements: m.achievements,
    })),
  };
}
