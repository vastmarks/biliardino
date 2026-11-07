import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { writeTransaction } from "~/server/db";
import { rebuildSeason } from "~/server/model/team";

export const teamsRouter = router({
  list: publicProcedure
    .input(z.object({ teamsize: z.number().int().min(1).max(2).default(1) }))
    .query(({ input }) =>
      prisma.team.findMany({
        include: { meta: true },
        where: { teamsize: input.teamsize },
      }),
    ),

  /** Team page data; `null` if the team has never played. */
  byId: publicProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .query(({ input }) =>
      prisma.team.findUnique({
        include: { meta: true, achievements: true },
        where: { name: input.name },
      }),
    ),

  /** Deletes a team with all its matches, then recalculates the seasons involved (admin). */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) =>
      writeTransaction(async db => {
        const team = await db.team.findUnique({ where: { id: input.id } });
        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }
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
        return team;
      }),
    ),

  /** Takes an achievement away again (admin). */
  deleteAchievement: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) =>
      writeTransaction(async db => {
        const achievement = await db.teamAchievement.findUnique({
          where: { id: input.id },
        });
        if (!achievement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Achievement not found",
          });
        }
        await db.teamAchievement.delete({ where: { id: input.id } });
        await rebuildSeason(db, achievement.season);
      }),
    ),
});
