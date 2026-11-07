import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "~/server/trpc";
import { z } from "zod";
import { prisma } from "~/server/prisma";
import { getCurrentSeason } from "~/server/model/season";
import { writeTransaction } from "~/server/db";
import {
  cleanPlayerName,
  playerKey,
  validatePlayerName,
} from "~/utils/players";
import { playerAddValidation } from "~/utils/validation";
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
  /** All known players (for the player pickers), alphabetical. */
  all: publicProcedure.query(async () => {
    const players = await prisma.player.findMany({
      select: { id: true, name: true, key: true },
    });
    return players.sort((a, b) => a.name.localeCompare(b.name));
  }),

  /** Defines a new player. Names are unique case-insensitively. */
  create: publicProcedure
    .input(playerAddValidation)
    .mutation(async ({ input }) => {
      const problem = validatePlayerName(input.name);
      if (problem) {
        throw new TRPCError({ code: "BAD_REQUEST", message: problem });
      }
      const name = cleanPlayerName(input.name);
      const key = playerKey(name);
      return writeTransaction(async db => {
        const existing = await db.player.findUnique({ where: { key } });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${existing.name} already exists`,
          });
        }
        return db.player.create({ data: { name, key } });
      });
    }),

  /** Only players who haven't played yet can be removed (admin). */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) =>
      writeTransaction(async db => {
        const player = await db.player.findUnique({ where: { id: input.id } });
        if (!player) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Unknown player" });
        }
        const teams = await db.team.findMany({ select: { name: true } });
        if (teams.some(t => parsePlayers(t.name).includes(player.key))) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${player.name} has already played matches and can't be deleted`,
          });
        }
        await db.player.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
    ),

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
      const everybody = computePlayerStats(matches);
      const index = everybody.findIndex(p => p.name === name);
      if (index === -1) {
        return null;
      }
      const player = everybody[index];
      const rank = index + 1;

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
