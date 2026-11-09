import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/generated/prisma/client";
import { publicProcedure, roleAwareProcedure, router } from "~/server/trpc";
import { prisma } from "~/server/prisma";
import { writeTransaction } from "~/server/db";
import { createMatch } from "~/server/model/match";
import { withAchievements } from "~/server/model/achievements";
import { getOrCreateTeam } from "~/server/model/team";
import { getCurrentSeason } from "~/server/model/season";
import { rebuildSeason } from "~/server/model/team";
import { matchAddValidation, matchUpdateValidation } from "~/utils/validation";
import { canModifyMatch, EDIT_WINDOW_HOURS } from "~/utils/editRules";
import { teamNameFromKeys } from "~/utils/players";
import { getTeamSize } from "~/model";

/**
 * Filter for matches of one team, or between two teams. `exact: false` also finds teams the
 * name is part of (e.g. all pairs of a player).
 */
function teamFilter(
  team1?: string,
  team2?: string,
  exact = true,
): Prisma.MatchWhereInput {
  if (!team1) {
    return {};
  }
  const name = (n: string) => (exact ? n : { contains: n });
  if (!team2) {
    return { OR: [{ team1: name(team1) }, { team2: name(team1) }] };
  }
  return {
    OR: [
      { team1: name(team1), team2: name(team2) },
      { team1: name(team2), team2: name(team1) },
    ],
  };
}

/**
 * Conditions for "the player is on this side": team names are sorted player keys joined by a
 * comma, so the key is the whole name, the first part or the last part.
 */
function sideHas(
  side: "team1" | "team2",
  key: string,
): Prisma.MatchWhereInput[] {
  return [
    { [side]: key },
    { [side]: { startsWith: `${key},` } },
    { [side]: { endsWith: `,${key}` } },
  ];
}

export const matchesRouter = router({
  /** Latest matches (of a team, or between two teams) of a season. */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        team1: z.string().max(200).optional(),
        team2: z.string().max(200).optional(),
        season: z.number().int().optional(),
      }),
    )
    .query(async ({ input }) =>
      withAchievements(
        await prisma.match.findMany({
          take: input.limit,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          where: {
            ...teamFilter(input.team1, input.team2),
            season: input.season ?? (await getCurrentSeason()),
          },
        }),
      ),
    ),

  /**
   * The matches page: newest first, paginated ("Load more"), optionally only one format, one
   * player's matches, or all seasons.
   */
  infiniteList: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.number().int().nullish(),
        /** a player's key: matches they played on either side */
        player: z.string().max(100).optional(),
        format: z.enum(["1v1", "2v2"]).optional(),
        /** a season number, "all" for every season; default the current one */
        season: z.union([z.number().int(), z.literal("all")]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const where: Prisma.MatchWhereInput[] = [];
      if (input.season !== "all") {
        where.push({ season: input.season ?? (await getCurrentSeason()) });
      }
      if (input.player) {
        where.push({
          OR: [
            ...sideHas("team1", input.player),
            ...sideHas("team2", input.player),
          ],
        });
      }
      if (input.format) {
        // a 2v2 team name has a comma ("anna,marco"), a 1v1 one doesn't
        where.push({
          team1:
            input.format === "2v2"
              ? { contains: "," }
              : { not: { contains: "," } },
        });
      }
      const items = await prisma.match.findMany({
        take: input.limit + 1,
        where: { AND: where },
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const nextCursor =
        items.length > input.limit ? items.pop()!.id : undefined;
      return { items: await withAchievements(items), nextCursor };
    }),

  /**
   * Records a match. Teams are built from the picked players, so the order of the picks
   * can never create a second team.
   */
  add: publicProcedure.input(matchAddValidation).mutation(async ({ input }) => {
    const ids = [...input.players1, ...input.players2];
    const players = await prisma.player.findMany({
      where: { id: { in: ids } },
    });
    if (players.length !== ids.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Unknown player, please reload the page",
      });
    }
    const team = (side: number[]) =>
      teamNameFromKeys(side.map(id => players.find(p => p.id === id)!.key));

    return writeTransaction(db =>
      createMatch(db, {
        team1: team(input.players1),
        team2: team(input.players2),
        score1: input.score1,
        score2: input.score2,
        comment: input.comment,
      }),
    );
  }),

  /**
   * Corrects a saved match: players (same number per side), score, note. The season's
   * ratings are recalculated from scratch afterwards. Everybody may do this for
   * EDIT_WINDOW_HOURS after the match, the admin always.
   */
  update: roleAwareProcedure
    .input(matchUpdateValidation)
    .mutation(async ({ input, ctx }) => {
      const ids = [...input.players1, ...input.players2];
      const players = await prisma.player.findMany({
        where: { id: { in: ids } },
      });
      if (players.length !== ids.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown player, please reload the page",
        });
      }
      const team = (side: number[]) =>
        teamNameFromKeys(side.map(id => players.find(p => p.id === id)!.key));

      return writeTransaction(async db => {
        const match = await db.match.findUnique({ where: { id: input.id } });
        if (!match) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }
        assertMayModify(match.createdAt, ctx.isAdmin);
        const team1 = team(input.players1);
        const team2 = team(input.players2);
        if (getTeamSize(team1) !== match.teamsize) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "A 1v1 can't be turned into a 2v2 (or back): delete it and enter a new one.",
          });
        }
        await getOrCreateTeam(db, team1);
        await getOrCreateTeam(db, team2);

        await db.match.update({
          where: { id: match.id },
          data: {
            team1,
            team2,
            score1: input.score1,
            score2: input.score2,
            comment: input.comment,
          },
        });
        await rebuildSeason(db, match.season);
        return db.match.findUniqueOrThrow({ where: { id: match.id } });
      });
    }),

  /**
   * Deletes a match and recalculates its season. Everybody may do this for
   * EDIT_WINDOW_HOURS after the match, the admin always.
   */
  delete: roleAwareProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input, ctx }) =>
      writeTransaction(async db => {
        const match = await db.match.findUnique({ where: { id: input.id } });
        if (!match) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }
        assertMayModify(match.createdAt, ctx.isAdmin);
        await db.match.delete({ where: { id: input.id } });
        await rebuildSeason(db, match.season);
        return match;
      }),
    ),
});

function assertMayModify(matchDate: Date, isAdmin: boolean) {
  if (!canModifyMatch(matchDate, isAdmin)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Matches older than ${EDIT_WINDOW_HOURS} hours can only be changed by the admin (log in at /admin).`,
    });
  }
}
