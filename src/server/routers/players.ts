import { TRPCError } from "@trpc/server";
import { publicProcedure, roleAwareProcedure, router } from "~/server/trpc";
import { z } from "zod";
import { prisma } from "~/server/prisma";
import { getCurrentSeason } from "~/server/model/season";
import { writeTransaction } from "~/server/db";
import { deleteTeamCascade } from "~/server/model/team";
import {
  cleanPlayerName,
  playerKey,
  teamNameFromKeys,
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
  /**
   * All known players, alphabetical, with the number of matches they played (all seasons)
   * and whether they are archived. Pickers hide the archived ones.
   */
  all: publicProcedure.query(async () => {
    const [players, teams] = await Promise.all([
      prisma.player.findMany({
        select: { id: true, name: true, key: true, archived: true },
      }),
      prisma.team.findMany({
        select: { name: true, meta: { select: { totalMatches: true } } },
      }),
    ]);
    const matchCount = new Map<string, number>();
    for (const team of teams) {
      const played = team.meta.reduce((sum, m) => sum + m.totalMatches, 0);
      for (const key of parsePlayers(team.name)) {
        matchCount.set(key, (matchCount.get(key) ?? 0) + played);
      }
    }
    return players
      .map(p => ({ ...p, matches: matchCount.get(p.key) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }),

  /** Just key and display name of everybody: what links and match lists need. */
  names: publicProcedure.query(() =>
    prisma.player.findMany({ select: { key: true, name: true } }),
  ),

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

  /**
   * Changes a player's name (typo, nickname). The key is part of every team name, so all
   * teams, matches and achievements of the player are renamed with it.
   */
  rename: publicProcedure
    .input(z.object({ id: z.number().int(), name: z.string().max(100) }))
    .mutation(({ input }) => {
      const problem = validatePlayerName(input.name);
      if (problem) {
        throw new TRPCError({ code: "BAD_REQUEST", message: problem });
      }
      const name = cleanPlayerName(input.name);
      const newKey = playerKey(name);
      return writeTransaction(async db => {
        const player = await db.player.findUnique({ where: { id: input.id } });
        if (!player) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Unknown player" });
        }
        const clash = await db.player.findUnique({ where: { key: newKey } });
        if (clash && clash.id !== player.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${clash.name} already exists`,
          });
        }
        if (newKey !== player.key) {
          const teams = await db.team.findMany({
            select: { id: true, name: true },
          });
          for (const team of teams) {
            const keys = parsePlayers(team.name);
            if (!keys.includes(player.key)) continue;
            const renamed = teamNameFromKeys(
              keys.map(k => (k === player.key ? newKey : k)),
            );
            await db.team.update({
              where: { id: team.id },
              data: { name: renamed },
            });
            await db.match.updateMany({
              where: { team1: team.name },
              data: { team1: renamed },
            });
            await db.match.updateMany({
              where: { team2: team.name },
              data: { team2: renamed },
            });
            await db.teamAchievement.updateMany({
              where: { teamId: team.id },
              data: { teamName: renamed },
            });
          }
        }
        return db.player.update({
          where: { id: player.id },
          data: { name, key: newKey },
        });
      });
    }),

  /** Hides a player from the match entry (or brings them back). History is kept. */
  archive: publicProcedure
    .input(z.object({ id: z.number().int(), archived: z.boolean() }))
    .mutation(async ({ input }) => {
      try {
        return await prisma.player.update({
          where: { id: input.id },
          data: { archived: input.archived },
        });
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown player" });
      }
    }),

  /**
   * Deletes a player. Without matches anybody may (a name added by mistake). A player with
   * matches takes all those matches with them and changes the ratings of everyone they
   * played with, so only the admin may, and the caller must repeat the player's name.
   */
  delete: roleAwareProcedure
    .input(z.object({ id: z.number().int(), confirmName: z.string().max(100) }))
    .mutation(({ input, ctx }) =>
      writeTransaction(async db => {
        const player = await db.player.findUnique({ where: { id: input.id } });
        if (!player) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Unknown player" });
        }
        const teams = (
          await db.team.findMany({ select: { id: true, name: true } })
        ).filter(t => parsePlayers(t.name).includes(player.key));
        const played = await db.match.count({
          where: {
            OR: teams.flatMap(t => [{ team1: t.name }, { team2: t.name }]),
          },
        });
        if (played > 0) {
          if (!ctx.isAdmin) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `${player.name} has played ${played} matches. Only the admin can delete such a player (log in at /admin), or archive them instead.`,
            });
          }
          if (playerKey(input.confirmName) !== player.key) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "The name typed for confirmation doesn't match",
            });
          }
        }
        for (const team of teams) {
          await deleteTeamCascade(db, team);
        }
        await db.player.delete({ where: { id: player.id } });
        return { id: player.id, deletedMatches: played };
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
