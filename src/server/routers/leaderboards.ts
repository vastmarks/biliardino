import { z } from "zod";
import type { TeamMeta } from "@prisma/client";
import { publicProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { Leaderboards } from "~/model";

type Category = Leaderboards["places"][number]["category"];

/** Which `TeamMeta` value each leaderboard category ranks by. */
const CATEGORIES: Array<[Category, keyof TeamMeta]> = [
  ["wins", "totalWins"],
  ["score", "totalScore"],
  ["matches", "totalMatches"],
  ["winRate", "totalWinRate"],
  ["rating", "rating"],
];

const DAY_MS = 24 * 60 * 60 * 1000;

export const leaderboardsRouter = router({
  /** Top 3 single players (1v1 teams) per category, plus how much was played. */
  forSeason: publicProcedure
    .input(z.object({ season: z.number().int() }))
    .query(async ({ input }): Promise<Leaderboards> => {
      const [first, last, total] = await Promise.all([
        prisma.match.findFirst({
          where: { season: input.season },
          orderBy: { createdAt: "asc" },
        }),
        prisma.match.findFirst({
          where: { season: input.season },
          orderBy: { createdAt: "desc" },
        }),
        prisma.match.count({ where: { season: input.season } }),
      ]);

      const leaderboards: Leaderboards = {
        season: input.season,
        totalMatches: { total, perDay: 0, days: 0 },
        places: [],
      };
      if (!first || !last) {
        return leaderboards;
      }

      // a season that started today still counts as one day
      const days = Math.max(
        1,
        (last.createdAt.getTime() - first.createdAt.getTime()) / DAY_MS,
      );
      leaderboards.totalMatches.days = days;
      leaderboards.totalMatches.perDay = Math.round(total / days);

      const metas = await prisma.teamMeta.findMany({
        where: {
          season: input.season,
          totalMatches: { gt: 0 },
          team: { teamsize: 1 },
        },
        include: { team: { select: { name: true } } },
      });

      leaderboards.places = CATEGORIES.flatMap(([category, field]) =>
        [...metas]
          .sort((a, b) => (b[field] as number) - (a[field] as number))
          .slice(0, 3)
          .map((meta, index) => ({
            category,
            team: meta.team.name,
            value: meta[field] as number,
            place: index + 1,
          })),
      );
      return leaderboards;
    }),
});
