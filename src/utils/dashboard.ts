/**
 * Dashboard statistics (home page). Everything here is a pure function of the match list,
 * so it is easy to test and the server and the tests can share it.
 *
 * Built on the per-player Elo replay of `playerStats.ts`.
 */
import {
  computePlayerStats,
  MatchLike,
  Outcome,
  parsePlayers,
  PlayerStats,
} from "~/utils/playerStats";
import { defaultRating } from "~/utils/elo";

export type PeriodKey = "today" | "week" | "month" | "season";
export const PERIODS: PeriodKey[] = ["today", "week", "month", "season"];

/** Min. matches before a player counts as ranked on the season board. */
export const RANKED_MIN_MATCHES = 5;
export const FORM_LENGTH = 5;
export const HOT_STREAK_MIN = 3;
export const ACTIVE_MIN_MATCHES = 3;
export const UPSET_MIN_GAP = 40;
export const PAIR_MIN_MATCHES = 3;

export interface BoardRow {
  /** player key (lower-case name) */
  name: string;
  /** current season rating */
  rating: number;
  /** rating change within the period (season: since the first match) */
  delta: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  /** last results over the whole season, oldest first */
  form: Outcome[];
  /** season board only: places gained (+) or lost (-) since the comparison point */
  rankChange: number | null;
  /** season board only: first appeared after the comparison point */
  isNew: boolean;
  /** season board only: not ranked yet (fewer than RANKED_MIN_MATCHES matches) */
  placement: boolean;
}

export interface Tiles {
  streak: { player: string; length: number } | null;
  gain: { player: string; delta: number; matches: number } | null;
  upset: {
    winners: string[];
    losers: string[];
    /** how many rating points weaker the winning side was */
    gap: number;
    winnerScore: number;
    loserScore: number;
    matchId: number;
    date: string;
  } | null;
  active: { player: string; matches: number; wins: number } | null;
}

export interface PairRow {
  players: string[];
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface DashboardStats {
  boards: Record<PeriodKey, BoardRow[]>;
  tiles: Tiles;
}

function compareSeason(
  a: { placement: boolean; rating: number; matches: number; name: string },
  b: { placement: boolean; rating: number; matches: number; name: string },
) {
  return (
    Number(a.placement) - Number(b.placement) ||
    b.rating - a.rating ||
    b.matches - a.matches ||
    a.name.localeCompare(b.name)
  );
}

function rankMap(stats: PlayerStats[]): Map<string, number> {
  const ordered = stats
    .map(p => ({
      name: p.name,
      rating: p.rating,
      matches: p.matches,
      placement: p.matches < RANKED_MIN_MATCHES,
    }))
    .sort(compareSeason);
  return new Map(ordered.map((p, i) => [p.name, i + 1]));
}

const time = (d: Date | string) => new Date(d).getTime();

/**
 * @param matches        all matches of ONE season
 * @param periodStarts   start (inclusive) of the today / week / month windows
 */
export function computeDashboard(
  matches: MatchLike[],
  periodStarts: Record<"today" | "week" | "month", Date>,
): DashboardStats {
  const stats = computePlayerStats(matches);

  // --- rank movement: compare with the standings right before the week window
  const before = matches.filter(
    m => time(m.createdAt) < periodStarts.week.getTime(),
  );
  const oldRanks =
    before.length > 0 ? rankMap(computePlayerStats(before)) : null;
  const newRanks = rankMap(stats);

  const toRow = (
    p: PlayerStats,
    inWindow: PlayerStats["history"],
  ): BoardRow => {
    const wins = inWindow.filter(h => h.outcome === "W").length;
    const losses = inWindow.filter(h => h.outcome === "L").length;
    const draws = inWindow.length - wins - losses;
    return {
      name: p.name,
      rating: p.rating,
      delta: inWindow.reduce((sum, h) => sum + h.change, 0),
      matches: inWindow.length,
      wins,
      losses,
      draws,
      winRate: inWindow.length ? wins / inWindow.length : 0,
      form: p.history.slice(-FORM_LENGTH).map(h => h.outcome),
      rankChange: null,
      isNew: false,
      placement: p.matches < RANKED_MIN_MATCHES,
    };
  };

  const windowBoard = (start: Date): BoardRow[] =>
    stats
      .map(p =>
        toRow(
          p,
          p.history.filter(h => h.createdAt.getTime() >= start.getTime()),
        ),
      )
      .filter(r => r.matches > 0)
      .sort(
        (a, b) =>
          b.delta - a.delta ||
          b.winRate - a.winRate ||
          b.matches - a.matches ||
          a.name.localeCompare(b.name),
      );

  const seasonBoard: BoardRow[] = stats
    .map(p => {
      const row = toRow(p, p.history);
      const newRank = newRanks.get(p.name)!;
      const oldRank = oldRanks?.get(p.name);
      row.rankChange = oldRank !== undefined ? oldRank - newRank : null;
      row.isNew = oldRanks !== null && oldRank === undefined;
      return row;
    })
    .sort(compareSeason);

  const boards: Record<PeriodKey, BoardRow[]> = {
    today: windowBoard(periodStarts.today),
    week: windowBoard(periodStarts.week),
    month: windowBoard(periodStarts.month),
    season: seasonBoard,
  };

  // --- tiles
  const streaker = stats
    .filter(
      p =>
        p.currentStreak.type === "W" &&
        p.currentStreak.length >= HOT_STREAK_MIN,
    )
    .sort(
      (a, b) =>
        b.currentStreak.length - a.currentStreak.length || b.rating - a.rating,
    )[0];

  const gainer = boards.week.find(r => r.delta > 0);
  const busiest = [...boards.week]
    .filter(r => r.matches >= ACTIVE_MIN_MATCHES)
    .sort(
      (a, b) =>
        b.matches - a.matches ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    )[0];

  // biggest upset: the decisive match where the winning side had the lowest average rating
  // compared with the losing side, using the ratings *before* that match
  const pre = new Map<number, Map<string, number>>();
  for (const p of stats) {
    for (const h of p.history) {
      let m = pre.get(h.matchId);
      if (!m) pre.set(h.matchId, (m = new Map()));
      m.set(p.name, h.rating - h.change);
    }
  }
  let upset: Tiles["upset"] = null;
  for (const m of matches) {
    if (m.score1 === m.score2) continue;
    const ratings = pre.get(m.id);
    if (!ratings) continue;
    const side1 = parsePlayers(m.team1);
    const side2 = parsePlayers(m.team2);
    const avg = (side: string[]) =>
      side.reduce((s, n) => s + (ratings.get(n) ?? defaultRating), 0) /
      side.length;
    const firstWon = m.score1 > m.score2;
    const winners = firstWon ? side1 : side2;
    const losers = firstWon ? side2 : side1;
    const gap = avg(losers) - avg(winners);
    if (gap >= UPSET_MIN_GAP && (!upset || gap > upset.gap)) {
      upset = {
        winners,
        losers,
        gap,
        winnerScore: Math.max(m.score1, m.score2),
        loserScore: Math.min(m.score1, m.score2),
        matchId: m.id,
        date: new Date(m.createdAt).toISOString(),
      };
    }
  }

  return {
    boards,
    tiles: {
      streak: streaker
        ? { player: streaker.name, length: streaker.currentStreak.length }
        : null,
      gain: gainer
        ? { player: gainer.name, delta: gainer.delta, matches: gainer.matches }
        : null,
      upset,
      active: busiest
        ? { player: busiest.name, matches: busiest.matches, wins: busiest.wins }
        : null,
    },
  };
}

/** Pair (2-player team) standings for one season, best rating first. */
export function topPairs(
  teams: Array<{
    name: string;
    teamsize: number;
    meta: Array<{
      season: number;
      rating: number;
      totalMatches: number;
      totalWins: number;
      totalLosses: number;
    }>;
  }>,
  season: number,
  minMatches = PAIR_MIN_MATCHES,
  limit = 5,
): PairRow[] {
  return teams
    .filter(t => t.teamsize === 2)
    .flatMap(t => {
      const m = t.meta.find(x => x.season === season);
      if (!m || m.totalMatches < minMatches) return [];
      return [
        {
          players: parsePlayers(t.name),
          rating: m.rating,
          matches: m.totalMatches,
          wins: m.totalWins,
          losses: m.totalLosses,
          winRate: m.totalMatches ? m.totalWins / m.totalMatches : 0,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.matches - a.matches ||
        a.players.join().localeCompare(b.players.join()),
    )
    .slice(0, limit);
}

/**
 * Player keys ordered by how recently they played (newest match first), for the match
 * entry picker. `matchesNewestFirst` only needs the team fields.
 */
export function recentPlayerOrder(
  matchesNewestFirst: Array<{ team1: string; team2: string }>,
): string[] {
  const seen: string[] = [];
  for (const m of matchesNewestFirst) {
    for (const key of [...parsePlayers(m.team1), ...parsePlayers(m.team2)]) {
      if (!seen.includes(key)) seen.push(key);
    }
  }
  return seen;
}
