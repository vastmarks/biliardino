/**
 * Team statistics (the `TeamMeta` table): pure functions, shared by "add a match" and
 * "rebuild a season", so both always produce exactly the same numbers.
 *
 * Every team has one meta row per season. A match updates the meta of both teams; deleting
 * a match (or a team) replays the whole season from the remaining matches, because every
 * later rating depends on the earlier ones.
 */
import { calculateRating, defaultRating, getExpectedRating } from "~/utils/elo";

/** The numbers stored in `TeamMeta` (everything except ids, season and timestamps). */
export interface TeamNumbers {
  rating: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalWinRate: number;
  totalScore: number;
  totalAvgScore: number;
  totalHighestRating: number;
  totalLowestRating: number;
  totalHighestWinStreak: number;
  totalHighestLosingStreak: number;
  currentWinStreak: number;
  currentLosingStreak: number;
  /** "daily" = the day of the team's most recent match */
  dailyMatches: number;
  dailyWins: number;
  dailyLosses: number;
  dailyWinRate: number;
  dailyScore: number;
  dailyAvgScore: number;
  /** date of the most recent match, null before the first one */
  lastMatchAt: Date | null;
}

export function emptyTeamNumbers(): TeamNumbers {
  return {
    rating: defaultRating,
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
    totalWinRate: 0,
    totalScore: 0,
    totalAvgScore: 0,
    totalHighestRating: defaultRating,
    totalLowestRating: defaultRating,
    totalHighestWinStreak: 0,
    totalHighestLosingStreak: 0,
    currentWinStreak: 0,
    currentLosingStreak: 0,
    dailyMatches: 0,
    dailyWins: 0,
    dailyLosses: 0,
    dailyWinRate: 0,
    dailyScore: 0,
    dailyAvgScore: 0,
    lastMatchAt: null,
  };
}

/** Same calendar day in the server's time zone (TZ). */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Result of one match for one team. A draw counts as half a win for the rating and as
 * neither a win nor a loss in the counters; it ends any streak.
 */
export function applyResult(
  before: TeamNumbers,
  opponentRating: number,
  score: number,
  opponentScore: number,
  date: Date,
): { after: TeamNumbers; ratingChange: number } {
  const win = score > opponentScore;
  const loss = score < opponentScore;
  const actual = win ? 1 : loss ? 0 : 0.5;
  const rating = calculateRating(
    getExpectedRating(before.rating, opponentRating),
    actual,
    before.rating,
  );

  const totalMatches = before.totalMatches + 1;
  const totalWins = before.totalWins + (win ? 1 : 0);
  const totalScore = before.totalScore + score;
  const currentWinStreak = win ? before.currentWinStreak + 1 : 0;
  const currentLosingStreak = loss ? before.currentLosingStreak + 1 : 0;

  const sameDay =
    before.lastMatchAt !== null && isSameLocalDay(before.lastMatchAt, date);
  const dailyMatches = (sameDay ? before.dailyMatches : 0) + 1;
  const dailyWins = (sameDay ? before.dailyWins : 0) + (win ? 1 : 0);
  const dailyScore = (sameDay ? before.dailyScore : 0) + score;

  return {
    ratingChange: rating - before.rating,
    after: {
      rating,
      totalMatches,
      totalWins,
      totalLosses: before.totalLosses + (loss ? 1 : 0),
      totalWinRate: totalWins / totalMatches,
      totalScore,
      totalAvgScore: totalScore / totalMatches,
      totalHighestRating: Math.max(before.totalHighestRating, rating),
      totalLowestRating: Math.min(before.totalLowestRating, rating),
      totalHighestWinStreak: Math.max(
        before.totalHighestWinStreak,
        currentWinStreak,
      ),
      totalHighestLosingStreak: Math.max(
        before.totalHighestLosingStreak,
        currentLosingStreak,
      ),
      currentWinStreak,
      currentLosingStreak,
      dailyMatches,
      dailyWins,
      dailyLosses: (sameDay ? before.dailyLosses : 0) + (loss ? 1 : 0),
      dailyWinRate: dailyWins / dailyMatches,
      dailyScore,
      dailyAvgScore: dailyScore / dailyMatches,
      lastMatchAt: date,
    },
  };
}

export interface ReplayMatch {
  id: number;
  createdAt: Date;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
}

export interface MatchRatings {
  team1Rating: number;
  team2Rating: number;
  team1RatingChange: number;
  team2RatingChange: number;
}

/**
 * Replays the matches of one season in chronological order (ties broken by id).
 * Returns the final numbers of every team and the rating fields of every match.
 */
export function replaySeason(matches: ReplayMatch[]): {
  teams: Map<string, TeamNumbers>;
  matches: Map<number, MatchRatings>;
} {
  const teams = new Map<string, TeamNumbers>();
  const ratings = new Map<number, MatchRatings>();
  const get = (name: string) => teams.get(name) ?? emptyTeamNumbers();

  const ordered = [...matches].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
  );
  for (const m of ordered) {
    const t1 = get(m.team1);
    const t2 = get(m.team2);
    const r1 = applyResult(t1, t2.rating, m.score1, m.score2, m.createdAt);
    const r2 = applyResult(t2, t1.rating, m.score2, m.score1, m.createdAt);
    teams.set(m.team1, r1.after);
    teams.set(m.team2, r2.after);
    ratings.set(m.id, {
      team1Rating: r1.after.rating,
      team2Rating: r2.after.rating,
      team1RatingChange: r1.ratingChange,
      team2RatingChange: r2.ratingChange,
    });
  }
  return { teams, matches: ratings };
}

/** `TeamNumbers` as stored in the database (`lastMatchAt` is the meta's `updatedAt`). */
export function toMetaData({ lastMatchAt, ...numbers }: TeamNumbers) {
  return { ...numbers, updatedAt: lastMatchAt ?? new Date() };
}

/** Reads the stored meta back into `TeamNumbers`. */
export function fromMeta(
  meta: Omit<TeamNumbers, "lastMatchAt"> & { updatedAt: Date },
  hasMatches: boolean,
): TeamNumbers {
  const { updatedAt, ...rest } = meta;
  const numbers = emptyTeamNumbers();
  for (const key of Object.keys(numbers) as Array<keyof TeamNumbers>) {
    if (key !== "lastMatchAt" && key in rest) {
      (numbers as unknown as Record<string, unknown>)[key] = (
        rest as unknown as Record<string, unknown>
      )[key];
    }
  }
  numbers.lastMatchAt = hasMatches ? new Date(updatedAt) : null;
  return numbers;
}
