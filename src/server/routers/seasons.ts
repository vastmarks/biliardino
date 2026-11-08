import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { writeTransaction } from "~/server/db";

export const seasonsRouter = router({
  /**
   * All seasons, the current one first, each with its number of matches and the dates of its
   * first and last match (a season's dates are simply when it was played; editing or deleting
   * matches keeps them right without storing anything extra).
   */
  list: publicProcedure.query(async () => {
    const [seasons, stats] = await Promise.all([
      prisma.season.findMany({
        orderBy: [{ current: "desc" }, { number: "desc" }],
      }),
      prisma.match.groupBy({
        by: ["season"],
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
    ]);
    const bySeason = new Map(stats.map(s => [s.season, s]));
    return seasons.map(season => {
      const s = bySeason.get(season.number);
      return {
        ...season,
        matches: s?._count._all ?? 0,
        firstMatchAt: s?._min.createdAt ?? null,
        lastMatchAt: s?._max.createdAt ?? null,
      };
    });
  }),

  /**
   * Starts the next season (highest number + 1) and makes it the current one: new matches
   * count there and ratings start again at 1000 (admin).
   */
  start: protectedProcedure.mutation(() =>
    writeTransaction(async db => {
      const last = await db.season.findFirst({ orderBy: { number: "desc" } });
      await db.season.updateMany({ data: { current: false } });
      return db.season.create({
        data: { number: (last?.number ?? 0) + 1, current: true },
      });
    }),
  ),

  /** Makes another season the current one again, e.g. one that was started by mistake (admin). */
  activate: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) =>
      writeTransaction(async db => {
        await db.season.updateMany({ data: { current: false } });
        return db.season.update({
          where: { id: input.id },
          data: { current: true },
        });
      }),
    ),

  /**
   * Deletes a season that isn't the current one (admin). A season with matches is deleted
   * together with its matches, team ratings and achievements; for that the request must
   * repeat the season's number (`confirm`), like typing a name to delete a player.
   * Players stay, and their numbers in other seasons are not affected.
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        confirm: z.number().int().optional(),
      }),
    )
    .mutation(({ input }) =>
      writeTransaction(async db => {
        const season = await db.season.findUnique({ where: { id: input.id } });
        if (!season) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Season not found",
          });
        }
        if (season.current) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "The current season can't be deleted. Make another season current first.",
          });
        }
        const matches = await db.match.count({
          where: { season: season.number },
        });
        if (matches > 0 && input.confirm !== season.number) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Season ${season.number} has ${matches} matches. Type the season number to delete it with all of them.`,
          });
        }
        // achievements go with their matches (cascade); team ratings are per season
        await db.match.deleteMany({ where: { season: season.number } });
        await db.teamMeta.deleteMany({ where: { season: season.number } });
        await db.teamAchievement.deleteMany({
          where: { season: season.number },
        });
        await db.season.delete({ where: { id: season.id } });
        return { number: season.number, deletedMatches: matches };
      }),
    ),
});
