/**
 * Per-player statistics.
 *
 * Hilde stores matches between *teams* (comma separated player names, e.g. "anna,marco").
 * Everything in here is derived from the match list by replaying it in chronological order,
 * so it works for historical data, needs no extra database tables and can't drift out of
 * sync when a match is deleted.
 *
 * Rating model: standard Elo (same K-factors as the team rating), where a side's strength is
 * the average rating of its players. Every player of a side receives the same expected score
 * and the same win/loss outcome, but each player's own K-factor applies to their own rating.
 * This works for any combination of team sizes (1v1, 2v2, ...).
 */
import { calculateRating, defaultRating, getExpectedRating } from "~/utils/elo";

export const PROVISIONAL_MATCHES = 5;

export interface MatchLike {
  id: number;
  createdAt: Date | string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
}

export type Outcome = "W" | "L" | "D";

export interface RecordStat {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface PersonStat extends RecordStat {
  player: string;
}

export interface RatingPoint {
  matchId: number;
  createdAt: Date;
  rating: number;
  change: number;
  outcome: Outcome;
}

export interface PlayerStats extends RecordStat {
  name: string;
  rating: number;
  highestRating: number;
  lowestRating: number;
  provisional: boolean;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  currentStreak: { type: Outcome | null; length: number };
  longestWinStreak: number;
  longestLosingStreak: number;
  lastPlayedAt: Date | null;
  /** results per format, keyed like "1v1" or "2v2" */
  formats: Record<string, RecordStat>;
  /** players this player has played *with*, most played first */
  partners: PersonStat[];
  /** players this player has played *against*, most played first */
  opponents: PersonStat[];
  /** rating after each match, oldest first */
  history: RatingPoint[];
}

export function parsePlayers(team: string): string[] {
  return Array.from(
    new Set(
      team
        .split(",")
        .map(p => p.trim().toLowerCase())
        .filter(p => p !== ""),
    ),
  );
}

function emptyRecord(): RecordStat {
  return { matches: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
}

function addOutcome(record: RecordStat, outcome: Outcome) {
  record.matches += 1;
  if (outcome === "W") record.wins += 1;
  else if (outcome === "L") record.losses += 1;
  else record.draws += 1;
  record.winRate = record.wins / record.matches;
}

function outcomeOf(own: number, other: number): Outcome {
  return own > other ? "W" : own < other ? "L" : "D";
}

interface Builder extends PlayerStats {
  _partners: Map<string, RecordStat>;
  _opponents: Map<string, RecordStat>;
  _winStreak: number;
  _loseStreak: number;
}

function newBuilder(name: string): Builder {
  return {
    name,
    ...emptyRecord(),
    rating: defaultRating,
    highestRating: defaultRating,
    lowestRating: defaultRating,
    provisional: true,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    avgGoalsFor: 0,
    avgGoalsAgainst: 0,
    currentStreak: { type: null, length: 0 },
    longestWinStreak: 0,
    longestLosingStreak: 0,
    lastPlayedAt: null,
    formats: {},
    partners: [],
    opponents: [],
    history: [],
    _partners: new Map(),
    _opponents: new Map(),
    _winStreak: 0,
    _loseStreak: 0,
  };
}

function byMostPlayed(a: PersonStat, b: PersonStat) {
  return (
    b.matches - a.matches ||
    b.winRate - a.winRate ||
    a.player.localeCompare(b.player)
  );
}

/**
 * Replays the given matches (in chronological order) and returns stats for every player,
 * sorted by rating (highest first).
 */
export function computePlayerStats(matches: MatchLike[]): PlayerStats[] {
  const ordered = [...matches].sort((a, b) => {
    const diff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });

  const players = new Map<string, Builder>();
  const get = (name: string) => {
    let p = players.get(name);
    if (!p) {
      p = newBuilder(name);
      players.set(name, p);
    }
    return p;
  };

  for (const match of ordered) {
    const side1 = parsePlayers(match.team1);
    const side2 = parsePlayers(match.team2);
    if (side1.length === 0 || side2.length === 0) continue;
    // a player can't play against themselves
    if (side1.some(p => side2.includes(p))) continue;

    const date = new Date(match.createdAt);
    const sides = [
      { own: side1, other: side2, score: match.score1, against: match.score2 },
      { own: side2, other: side1, score: match.score2, against: match.score1 },
    ];

    const avg = (names: string[]) =>
      names.reduce((sum, n) => sum + get(n).rating, 0) / names.length;
    const avg1 = avg(side1);
    const avg2 = avg(side2);
    const expected = [
      getExpectedRating(avg1, avg2),
      getExpectedRating(avg2, avg1),
    ];
    const format = `${side1.length}v${side2.length}`;
    const formatReverse = `${side2.length}v${side1.length}`;

    // compute everything from pre-match ratings first, then apply
    const updates = sides.map((side, i) => {
      const outcome = outcomeOf(side.score, side.against);
      const actual = outcome === "W" ? 1 : outcome === "L" ? 0 : 0.5;
      return side.own.map(name => ({
        name,
        outcome,
        next: calculateRating(expected[i], actual, get(name).rating),
      }));
    });

    sides.forEach((side, i) => {
      const outcome = outcomeOf(side.score, side.against);
      const key = i === 0 ? format : formatReverse;
      updates[i].forEach(({ name, next }) => {
        const p = get(name);
        const change = next - p.rating;
        addOutcome(p, outcome);
        p.goalsFor += side.score;
        p.goalsAgainst += side.against;
        p.rating = next;
        p.highestRating = Math.max(p.highestRating, next);
        p.lowestRating = Math.min(p.lowestRating, next);
        p.lastPlayedAt = date;

        if (outcome === "W") {
          p._winStreak += 1;
          p._loseStreak = 0;
        } else if (outcome === "L") {
          p._loseStreak += 1;
          p._winStreak = 0;
        } else {
          p._winStreak = 0;
          p._loseStreak = 0;
        }
        p.longestWinStreak = Math.max(p.longestWinStreak, p._winStreak);
        p.longestLosingStreak = Math.max(p.longestLosingStreak, p._loseStreak);
        const last = p.currentStreak;
        p.currentStreak =
          last.type === outcome
            ? { type: outcome, length: last.length + 1 }
            : { type: outcome, length: 1 };

        addOutcome((p.formats[key] ??= emptyRecord()), outcome);
        for (const mate of side.own) {
          if (mate === name) continue;
          const rec = p._partners.get(mate) ?? emptyRecord();
          addOutcome(rec, outcome);
          p._partners.set(mate, rec);
        }
        for (const opp of side.other) {
          const rec = p._opponents.get(opp) ?? emptyRecord();
          addOutcome(rec, outcome);
          p._opponents.set(opp, rec);
        }
        p.history.push({
          matchId: match.id,
          createdAt: date,
          rating: next,
          change,
          outcome,
        });
      });
    });
  }

  return Array.from(players.values())
    .map(b => {
      const { _partners, _opponents, _winStreak, _loseStreak, ...p } = b;
      void _winStreak;
      void _loseStreak;
      return {
        ...p,
        provisional: p.matches < PROVISIONAL_MATCHES,
        goalDifference: p.goalsFor - p.goalsAgainst,
        avgGoalsFor: p.matches ? p.goalsFor / p.matches : 0,
        avgGoalsAgainst: p.matches ? p.goalsAgainst / p.matches : 0,
        partners: Array.from(_partners, ([player, r]) => ({
          player,
          ...r,
        })).sort(byMostPlayed),
        opponents: Array.from(_opponents, ([player, r]) => ({
          player,
          ...r,
        })).sort(byMostPlayed),
      };
    })
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.matches - a.matches ||
        a.name.localeCompare(b.name),
    );
}

/** Same as computePlayerStats, but for one player (null if they never played). */
export function computeStatsForPlayer(
  matches: MatchLike[],
  name: string,
): PlayerStats | null {
  const wanted = name.trim().toLowerCase();
  // every match of other players still matters for ratings, so we replay all of them
  return computePlayerStats(matches).find(p => p.name === wanted) ?? null;
}

/** Whether the given player took part in the match. */
export function playedIn(match: MatchLike, name: string): boolean {
  return (
    parsePlayers(match.team1).includes(name) ||
    parsePlayers(match.team2).includes(name)
  );
}
