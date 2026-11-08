import { publicProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { getCurrentSeason } from "~/server/model/season";
import { computeHallOfFame } from "~/utils/hallOfFame";

export const hallOfFameRouter = router({
  /** All-time records and the champion of every season (see utils/hallOfFame.ts). */
  get: publicProcedure.query(async () => {
    const [matches, pairs, currentSeason] = await Promise.all([
      prisma.match.findMany({
        select: {
          id: true,
          createdAt: true,
          season: true,
          team1: true,
          team2: true,
          score1: true,
          score2: true,
        },
      }),
      prisma.team.findMany({
        // singles (1v1) and pairs (2v2), for each season's champions
        select: {
          name: true,
          teamsize: true,
          meta: {
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
      getCurrentSeason(),
    ]);
    return computeHallOfFame(matches, pairs, currentSeason);
  }),
});
