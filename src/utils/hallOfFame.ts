/**
 * Hall of Fame: all-time records and season champions.
 *
 * Everything is derived from the match list with the same rating replay the home page uses
 * (`computePlayerStats` per season, everyone starting the season at 1000), so a champion here
 * is always the player who topped the leaderboard at the end of that season. Pure: no database.
 *
 * When two players share a record, it belongs to whoever set it first.
 */
import {
  MatchLike,
  PROVISIONAL_MATCHES,
  computePlayerStats,
  parsePlayers,
} from "~/utils/playerStats";
import { PAIR_MIN_MATCHES, UPSET_MIN_GAP, topPairs } from "~/utils/dashboard";

export interface SeasonMatch extends MatchLike {
  id: number;
  season: number;
}

export interface PairMeta {
  name: string;
  teamsize: number;
  meta: Array<{
    season: number;
    rating: number;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
  }>;
}

export type RecordKey =
  | "peakRating"
  | "winStreak"
  | "mostWins"
  | "biggestWin"
  | "biggestUpset"
  | "marathon";

export interface HallRecord {
  key: RecordKey;
  /** the record holder(s): one player, or the players of the winning side */
  players: string[];
  /** the other side, for match records */
  opponents?: string[];
  /** the number the record is about (rating, wins, goal margin, ...) */
  value: number;
  /** extra numbers shown with the record, e.g. the score of the match */
  detail?: Record<string, number>;
  season?: number;
  /** when the record was set (for a streak: when it ended or the last match of it) */
  date: Date;
}

export interface SeasonChampion {
  season: number;
  current: boolean;
  matches: number;
  /** first and last match of the season */
  from: Date;
  to: Date;
  champion?: { player: string; rating: number; wins: number; losses: number };
  pair?: { players: string[]; rating: number };
}

export interface HallOfFame {
  records: HallRecord[];
  seasons: SeasonChampion[];
  totalMatches: number;
}

/** Most matches all time needed before "most wins" counts someone. */
export const MOST_WINS_MIN_MATCHES = PROVISIONAL_MATCHES;

const time = (d: Date | string) => new Date(d).getTime();

function chronological<T extends SeasonMatch>(matches: T[]): T[] {
  return [...matches].sort(
    (a, b) => time(a.createdAt) - time(b.createdAt) || a.id - b.id,
  );
}

/** Local calendar day of a date, as "YYYY-MM-DD" (the server's time zone, i.e. TZ). */
function dayKey(d: Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Keeps `candidate` only if it beats `best` (strictly: earlier records win ties). */
function better(
  best: HallRecord | undefined,
  candidate: HallRecord,
): HallRecord {
  return !best || candidate.value > best.value ? candidate : best;
}

export function computeHallOfFame(
  matches: SeasonMatch[],
  pairs: PairMeta[],
  currentSeason: number,
): HallOfFame {
  const ordered = chronological(matches);
  const records = new Map<RecordKey, HallRecord>();
  const keep = (r: HallRecord) =>
    records.set(r.key, better(records.get(r.key), r));

  // ---- per season: replay ratings (champions, peak ratings, upsets)
  const seasons = [...new Set(ordered.map(m => m.season))].sort(
    (a, b) => a - b,
  );
  const champions: SeasonChampion[] = [];
  for (const season of seasons) {
    const seasonMatches = ordered.filter(m => m.season === season);
    const stats = computePlayerStats(seasonMatches);

    // champion: best rating among players past the provisional matches
    const ranked = stats
      .filter(p => !p.provisional)
      .sort(
        (a, b) =>
          b.rating - a.rating ||
          b.matches - a.matches ||
          a.name.localeCompare(b.name),
      );
    const top = ranked[0];
    const pair = topPairs(pairs, season, PAIR_MIN_MATCHES, 1)[0];
    champions.push({
      season,
      current: season === currentSeason,
      matches: seasonMatches.length,
      from: new Date(seasonMatches[0].createdAt),
      to: new Date(seasonMatches[seasonMatches.length - 1].createdAt),
      champion: top && {
        player: top.name,
        rating: top.rating,
        wins: top.wins,
        losses: top.losses,
      },
      pair: pair && { players: pair.players, rating: pair.rating },
    });

    // peak rating: only once a player is past the provisional matches (early swings are big)
    for (const p of stats) {
      p.history.slice(PROVISIONAL_MATCHES - 1).forEach(point =>
        keep({
          key: "peakRating",
          players: [p.name],
          value: point.rating,
          season,
          date: new Date(point.createdAt),
        }),
      );
    }

    // upsets: rating of each side *before* the match
    const before = new Map<number, Map<string, number>>();
    for (const p of stats) {
      for (const point of p.history) {
        const m = before.get(point.matchId) ?? new Map<string, number>();
        m.set(p.name, point.rating - point.change);
        before.set(point.matchId, m);
      }
    }
    for (const m of seasonMatches) {
      if (m.score1 === m.score2) continue;
      const ratings = before.get(m.id);
      if (!ratings) continue;
      const avg = (team: string) => {
        const ps = parsePlayers(team);
        return ps.reduce((s, n) => s + (ratings.get(n) ?? 1000), 0) / ps.length;
      };
      const [winner, loser, ws, ls] =
        m.score1 > m.score2
          ? [m.team1, m.team2, m.score1, m.score2]
          : [m.team2, m.team1, m.score2, m.score1];
      const gap = Math.round(avg(loser) - avg(winner));
      if (gap >= UPSET_MIN_GAP) {
        keep({
          key: "biggestUpset",
          players: parsePlayers(winner),
          opponents: parsePlayers(loser),
          value: gap,
          detail: { score: ws, other: ls },
          season,
          date: new Date(m.createdAt),
        });
      }
    }
  }

  // ---- all time, match by match
  const streak = new Map<string, number>();
  const wins = new Map<string, number>();
  const played = new Map<string, number>();
  const perDay = new Map<string, number>();
  for (const m of ordered) {
    const date = new Date(m.createdAt);
    const sides = [
      {
        players: parsePlayers(m.team1),
        won: m.score1 > m.score2,
        lost: m.score1 < m.score2,
      },
      {
        players: parsePlayers(m.team2),
        won: m.score2 > m.score1,
        lost: m.score2 < m.score1,
      },
    ];
    for (const side of sides) {
      for (const p of side.players) {
        played.set(p, (played.get(p) ?? 0) + 1);
        if (side.won) wins.set(p, (wins.get(p) ?? 0) + 1);
        const s = side.won ? (streak.get(p) ?? 0) + 1 : 0;
        streak.set(p, s);
        if (s > 0)
          keep({
            key: "winStreak",
            players: [p],
            value: s,
            season: m.season,
            date,
          });
        const dk = `${p}|${dayKey(date)}`;
        const n = (perDay.get(dk) ?? 0) + 1;
        perDay.set(dk, n);
        keep({ key: "marathon", players: [p], value: n, date });
      }
    }
    const margin = Math.abs(m.score1 - m.score2);
    if (margin > 0) {
      const [winner, loser, ws, ls] =
        m.score1 > m.score2
          ? [m.team1, m.team2, m.score1, m.score2]
          : [m.team2, m.team1, m.score2, m.score1];
      keep({
        key: "biggestWin",
        players: parsePlayers(winner),
        opponents: parsePlayers(loser),
        value: margin,
        detail: { score: ws, other: ls },
        season: m.season,
        date,
      });
    }
  }

  // most wins: decided at the end; the tie goes to whoever played fewer matches
  const lastMatch = ordered[ordered.length - 1];
  const mostWins = [...wins]
    .filter(([p]) => (played.get(p) ?? 0) >= MOST_WINS_MIN_MATCHES)
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        (played.get(a[0]) ?? 0) - (played.get(b[0]) ?? 0) ||
        a[0].localeCompare(b[0]),
    )[0];
  if (mostWins && lastMatch) {
    records.set("mostWins", {
      key: "mostWins",
      players: [mostWins[0]],
      value: mostWins[1],
      detail: { matches: played.get(mostWins[0]) ?? 0 },
      date: new Date(lastMatch.createdAt),
    });
  }
  // a "marathon" of one match is not a record
  if ((records.get("marathon")?.value ?? 0) < 3) records.delete("marathon");
  if ((records.get("winStreak")?.value ?? 0) < 2) records.delete("winStreak");

  const ORDER: RecordKey[] = [
    "peakRating",
    "winStreak",
    "mostWins",
    "biggestWin",
    "biggestUpset",
    "marathon",
  ];
  return {
    records: ORDER.flatMap(k => (records.has(k) ? [records.get(k)!] : [])),
    seasons: champions.reverse(),
    totalMatches: ordered.length,
  };
}
