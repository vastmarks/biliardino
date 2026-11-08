import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/generated/prisma/client";
import { protectedProcedure, publicProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { writeTransaction } from "~/server/db";
import { seasonAddValidation } from "~/utils/validation";

export const seasonsRouter = router({
  /** All seasons, the current one first. */
  list: publicProcedure.query(() =>
    prisma.season.findMany({
      orderBy: [{ current: "desc" }, { number: "desc" }],
    }),
  ),

  /** Makes a season the current one; new matches go there (admin). */
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

  add: protectedProcedure
    .input(seasonAddValidation)
    .mutation(async ({ input }) => {
      try {
        return await prisma.season.create({
          data: { number: input.number, current: false },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Season ${input.number} already exists`,
          });
        }
        throw e;
      }
    }),

  /** Only an empty season that isn't the current one can be deleted (admin). */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
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
              "The current season can't be deleted. Activate another one first.",
          });
        }
        const matches = await db.match.count({
          where: { season: season.number },
        });
        if (matches > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Season ${season.number} has ${matches} matches and can't be deleted.`,
          });
        }
        return db.season.delete({ where: { id: input.id } });
      }),
    ),
});
