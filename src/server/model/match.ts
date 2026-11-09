import { TRPCError } from "@trpc/server";
import type { Db } from "~/server/db";
import { getCurrentSeason } from "~/server/model/season";
import {
  getOrCreateTeam,
  saveTeamNumbers,
  teamNumbers,
} from "~/server/model/team";
import { getTeamSize } from "~/model";
import { applyResult } from "~/utils/teamStats";

/** Same teams and result again within this time is treated as an accidental double entry. */
export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export interface NewMatch {
  /** canonical team names, see `teamNameFromKeys` */
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  comment?: string;
  date?: Date;
  /** defaults to the current season */
  season?: number;
}

/**
 * Records a match: updates both teams' numbers and stores the match with the rating
 * changes. Achievements are derived from the matches, so nothing is granted here. Call it
 * inside `writeTransaction`.
 */
export async function createMatch(db: Db, input: NewMatch) {
  const date = input.date ?? new Date();
  const season = input.season ?? (await getCurrentSeason(db));
  const { score1, score2 } = input;

  const duplicate = await db.match.findFirst({
    where: {
      season,
      createdAt: { gt: new Date(date.getTime() - DUPLICATE_WINDOW_MS) },
      OR: [
        { team1: input.team1, team2: input.team2, score1, score2 },
        {
          team1: input.team2,
          team2: input.team1,
          score1: score2,
          score2: score1,
        },
      ],
    },
  });
  if (duplicate) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This exact result was just saved. If it really happened twice, wait 5 minutes.",
    });
  }

  const team1 = await getOrCreateTeam(db, input.team1);
  const team2 = await getOrCreateTeam(db, input.team2);
  const before1 = teamNumbers(team1, season);
  const before2 = teamNumbers(team2, season);
  const r1 = applyResult(before1, before2.rating, score1, score2, date);
  const r2 = applyResult(before2, before1.rating, score2, score1, date);
  await saveTeamNumbers(db, team1, season, r1.after);
  await saveTeamNumbers(db, team2, season, r2.after);

  const match = await db.match.create({
    data: {
      team1: team1.name,
      team2: team2.name,
      score1,
      score2,
      comment: input.comment ?? "",
      game: "default",
      team1Rating: r1.after.rating,
      team2Rating: r2.after.rating,
      team1RatingChange: r1.ratingChange,
      team2RatingChange: r2.ratingChange,
      teamsize: getTeamSize(team1.name),
      season,
      createdAt: date,
    },
  });

  return match;
}
