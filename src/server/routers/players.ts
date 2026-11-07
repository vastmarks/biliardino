import { publicProcedure, router } from "~/server/trpc";
import { z } from "zod";
import { prisma } from "~/server/prisma";
import { getCurrentSeason } from "~/server/model/season";
import {
  computePlayerStats,
  parsePlayers,
  PlayerStats,
} from "~/utils/playerStats";

/** A season number, or "all" for every season (all-time stats). */
const scopeInput = z.union([z.number().int(), z.literal("all")]).optional();

async function loadMatches(scope: number | "all" | undefined) {
  const season =
    scope === "all" ? undefined : (scope ?? (await getCurrentSeason()));
  return prisma.match.findMany({
    where: season === undefined ? {} : { season },
    select: {
      id: true,
      createdAt: true,
      team1: true,
      team2: true,
      score1: true,
      score2: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

type PlayerSummary = Omit<PlayerStats, "partners" | "opponents" | "history">;

export const playersRouter = router({
  /** Leaderboard: every player with their stats, best rating first. */
  list: publicProcedure
    .input(z.object({ season: scopeInput }))
    .query(async ({ input }): Promise<PlayerSummary[]> => {
      const matches = await loadMatches(input.season);
      return computePlayerStats(matches).map(
        ({ partners, opponents, history, ...summary }) => {
          void partners;
          void opponents;
          void history;
          return summary;
        },
      );
    }),

  /** Full profile of one player incl. partners, opponents and rating history. */
  byName: publicProcedure
    .input(z.object({ name: z.string().min(1).max(100), season: scopeInput }))
    .query(async ({ input }) => {
      const name = input.name.trim().toLowerCase();
      const matches = await loadMatches(input.season);
      // ratings depend on everybody's matches, so replay all of them
      const player = computePlayerStats(matches).find(p => p.name === name);
      if (!player) {
        return null;
      }

      const rank =
        computePlayerStats(matches).findIndex(p => p.name === name) + 1;

      const recentIds = matches
        .filter(
          m =>
            parsePlayers(m.team1).includes(name) ||
            parsePlayers(m.team2).includes(name),
        )
        .slice(-10)
        .map(m => m.id);
      const recentMatches = await prisma.match.findMany({
        where: { id: { in: recentIds } },
        include: { achievements: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });

      return { player, rank, recentMatches };
    }),
});
