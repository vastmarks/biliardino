import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { writeTransaction } from "~/server/db";
import { deleteTeamCascade } from "~/server/model/team";
import { earnedBy, getEarned } from "~/server/model/achievements";

export const teamsRouter = router({
  list: publicProcedure
    .input(z.object({ teamsize: z.number().int().min(1).max(2).default(1) }))
    .query(async ({ input }) => {
      const [teams, earned] = await Promise.all([
        prisma.team.findMany({
          include: { meta: true },
          where: { teamsize: input.teamsize },
        }),
        getEarned(),
      ]);
      // team achievements (pairs): their points are shown for all seasons together
      const mine = new Map<string, Array<{ achievement: string }>>();
      for (const e of earned) {
        if (e.scope !== "team") continue;
        mine.set(e.subject, [
          ...(mine.get(e.subject) ?? []),
          { achievement: e.achievement },
        ]);
      }
      return teams.map(t => ({ ...t, achievements: mine.get(t.name) ?? [] }));
    }),

  /** Team page data; `null` if the team has never played. */
  byId: publicProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const team = await prisma.team.findUnique({
        include: { meta: true },
        where: { name: input.name },
      });
      if (!team) return null;
      const achievements = (await earnedBy("team", team.name)).map(e => ({
        achievement: e.achievement,
        createdAt: e.createdAt,
      }));
      return { ...team, achievements };
    }),

  /** Deletes a team with all its matches, then recalculates the seasons involved (admin). */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) =>
      writeTransaction(async db => {
        const team = await db.team.findUnique({ where: { id: input.id } });
        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }
        await deleteTeamCascade(db, team);
        return team;
      }),
    ),
});
