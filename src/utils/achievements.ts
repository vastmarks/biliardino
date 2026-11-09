/**
 * Achievements.
 *
 * Two kinds, each earned once, ever:
 *
 * - **personal** achievements belong to a player, in any format and with any partner:
 *   milestones (wins, matches, goals), the individual rating, streaks, calendar and daily
 *   feats. In a 2v2 both players of a side earn them on their own.
 * - **team** achievements belong to a pair (a 2v2 team): what two people do together.
 *   A 1v1 "team" is just the player, so it earns personal achievements only.
 *
 * Nothing is stored. Everything is derived by replaying all matches in order, like the
 * player statistics, so editing or deleting a match can never leave an achievement behind
 * or lose one (`computeAchievements`). Milestones count all seasons together; ratings and
 * streaks are per season, because ratings start again at 1000 every season.
 */
import { defaultRating } from "~/utils/elo";
import { computePlayerStats, parsePlayers } from "~/utils/playerStats";
import { isSameLocalDay } from "~/utils/teamStats";

export type Scope = "player" | "team";

/** What a personal achievement can look at, evaluated right after a match. */
export interface PlayerContext {
  match: { id: number; createdAt: Date; season: number };
  won: boolean;
  lost: boolean;
  /** all seasons together, this match included */
  career: { matches: number; wins: number; goals: number };
  /** this season: rating extremes and best streaks (this match included) */
  season: {
    highestRating: number;
    lowestRating: number;
    winStreak: number;
    losingStreak: number;
  };
  /** the player's matches on the day of this match */
  day: { matches: number; wins: number };
  /** ratings before the match: the player's own, and the opponents' average */
  rating: number;
  opponentRating: number;
  goalsFor: number;
  goalsAgainst: number;
  /** days since the player's previous match, null for the first one */
  daysAway: number | null;
}

/** What a team achievement can look at: the pair, together. */
export interface TeamContext {
  match: { id: number; createdAt: Date; season: number };
  won: boolean;
  /** all seasons together, this match included */
  career: { matches: number; wins: number };
  season: { highestRating: number; winStreak: number };
  /** team ratings before the match */
  rating: number;
  opponentRating: number;
}

interface Base {
  id: string;
  title: string;
  description: string;
  points: number;
}
export interface PlayerAchievement extends Base {
  scope: "player";
  condition: (c: PlayerContext) => boolean;
}
export interface TeamAchievementDef extends Base {
  scope: "team";
  condition: (c: TeamContext) => boolean;
}
export type Achievement = PlayerAchievement | TeamAchievementDef;

type Dated = { match: { createdAt: Date } };
const hour = (c: Dated) => c.match.createdAt.getHours();
const dayOfWeek = (c: Dated) => c.match.createdAt.getDay();
const onDate = (c: Dated, month: number, day: number) =>
  c.match.createdAt.getMonth() === month && c.match.createdAt.getDate() === day;

/**
 * Points follow the effort: 5 for something you do in your first match, up to 200 for the
 * rarest. A pair's achievements are worth a bit less than the personal one for the same
 * effort, because a pair's first 10 wins come together with each player's own.
 */
export const achievements: Achievement[] = [
  // ----- personal: wins
  {
    scope: "player",
    id: "wins-1",
    title: "First Win",
    description: "Win your first game",
    points: 5,
    condition: c => c.career.wins >= 1,
  },
  {
    scope: "player",
    id: "wins-10",
    title: "10 Wins",
    description: "Win 10 matches",
    points: 10,
    condition: c => c.career.wins >= 10,
  },
  {
    scope: "player",
    id: "wins-50",
    title: "50 Wins",
    description: "Win 50 games",
    points: 25,
    condition: c => c.career.wins >= 50,
  },
  {
    scope: "player",
    id: "wins-100",
    title: "100 Wins",
    description: "Win 100 matches",
    points: 50,
    condition: c => c.career.wins >= 100,
  },
  {
    scope: "player",
    id: "wins-500",
    title: "500 Wins",
    description: "Win 500 matches",
    points: 100,
    condition: c => c.career.wins >= 500,
  },
  {
    scope: "player",
    id: "wins-1000",
    title: "Winning is my hobby",
    description: "Win 1000 matches",
    points: 200,
    condition: c => c.career.wins >= 1000,
  },
  // ----- personal: matches
  {
    scope: "player",
    id: "matches-1",
    title: "First match",
    description: "Play your first match",
    points: 5,
    condition: c => c.career.matches >= 1,
  },
  {
    scope: "player",
    id: "matches-10",
    title: "10 Matches",
    description: "Play 10 matches",
    points: 5,
    condition: c => c.career.matches >= 10,
  },
  {
    scope: "player",
    id: "matches-50",
    title: "50 Matches",
    description: "Play 50 matches",
    points: 10,
    condition: c => c.career.matches >= 50,
  },
  {
    scope: "player",
    id: "matches-100",
    title: "100 Matches",
    description: "Play 100 matches",
    points: 25,
    condition: c => c.career.matches >= 100,
  },
  {
    scope: "player",
    id: "matches-500",
    title: "500 Matches",
    description: "Play 500 matches",
    points: 60,
    condition: c => c.career.matches >= 500,
  },
  {
    scope: "player",
    id: "matches-1000",
    title: "I haven't left this place for years",
    description: "Play 1000 matches",
    points: 120,
    condition: c => c.career.matches >= 1000,
  },
  // ----- personal: goals
  {
    scope: "player",
    id: "score-1",
    title: "First goal",
    description: "Score your first goal",
    points: 5,
    condition: c => c.career.goals >= 1,
  },
  {
    scope: "player",
    id: "score-10",
    title: "10 Goals",
    description: "Score a total of 10 goals",
    points: 5,
    condition: c => c.career.goals >= 10,
  },
  {
    scope: "player",
    id: "score-100",
    title: "100 Goals",
    description: "Score a total of 100 goals",
    points: 10,
    condition: c => c.career.goals >= 100,
  },
  {
    scope: "player",
    id: "score-1000",
    title: "1000 Goals",
    description: "Score a total of 1000 goals",
    points: 30,
    condition: c => c.career.goals >= 1000,
  },
  {
    scope: "player",
    id: "score-2500",
    title: "2500 Goals",
    description: "Score a total of 2500 goals",
    points: 60,
    condition: c => c.career.goals >= 2500,
  },
  {
    scope: "player",
    id: "score-5000",
    title: "5000 Goals",
    description: "Score a total of 5000 goals",
    points: 100,
    condition: c => c.career.goals >= 5000,
  },
  // ----- personal: rating (within a season)
  {
    scope: "player",
    id: "elo-100",
    title: "I'm getting better!",
    description: `Reach a rating of ${defaultRating + 100}`,
    points: 10,
    condition: c => c.season.highestRating >= defaultRating + 100,
  },
  {
    scope: "player",
    id: "elo-200",
    title: "Look mom, no hands!",
    description: `Reach a rating of ${defaultRating + 200}`,
    points: 25,
    condition: c => c.season.highestRating >= defaultRating + 200,
  },
  {
    scope: "player",
    id: "elo-300",
    title: "Whenever I need expert advice, I talk to myself",
    description: `Reach a rating of ${defaultRating + 300}`,
    points: 50,
    condition: c => c.season.highestRating >= defaultRating + 300,
  },
  {
    scope: "player",
    id: "elo-400",
    title: "Call me Magnus Carlsen",
    description: `Reach a rating of ${defaultRating + 400}`,
    points: 100,
    condition: c => c.season.highestRating >= defaultRating + 400,
  },
  {
    scope: "player",
    id: "elo-500",
    title: "Kneel before me, mortals!",
    description: `Reach a rating of ${defaultRating + 500}`,
    points: 200,
    condition: c => c.season.highestRating >= defaultRating + 500,
  },
  {
    scope: "player",
    id: "elo-minus300",
    title: "It's evolving, just backwards!",
    description: `Fall to a rating of ${defaultRating - 300}`,
    points: 25,
    condition: c => c.season.lowestRating <= defaultRating - 300,
  },
  {
    scope: "player",
    id: "elo-range",
    title: "Exkarlibur",
    description: `In one season, fall to ${defaultRating - 300} AND reach ${
      defaultRating + 300
    }`,
    points: 100,
    condition: c =>
      c.season.lowestRating <= defaultRating - 300 &&
      c.season.highestRating >= defaultRating + 300,
  },
  // ----- personal: streaks (within a season)
  {
    scope: "player",
    id: "consecutive-wins-5",
    title: "I am inevitable",
    description: "Win 5 games in a row",
    points: 25,
    condition: c => c.season.winStreak >= 5,
  },
  {
    scope: "player",
    id: "consecutive-wins-10",
    title: "Behold!",
    description: "Win 10 games in a row",
    points: 100,
    condition: c => c.season.winStreak >= 10,
  },
  {
    scope: "player",
    id: "consecutive-losses-10",
    title: "Are you even trying?",
    description: "Lose 10 games in a row",
    points: 10,
    condition: c => c.season.losingStreak >= 10,
  },
  // ----- personal: stronger and weaker opponents (ratings before the match)
  {
    scope: "player",
    id: "underdog",
    title: "Underdog",
    description:
      "Win a game against opponents rated at least 100 higher than you",
    points: 10,
    condition: c => c.won && c.opponentRating - c.rating >= 100,
  },
  {
    scope: "player",
    id: "badday",
    title: "Bad days happen",
    description:
      "Lose a game against opponents rated at least 100 lower than you",
    points: 10,
    condition: c => c.lost && c.rating - c.opponentRating >= 100,
  },
  {
    scope: "player",
    id: "david",
    title: "David",
    description:
      "Win a game against opponents rated at least 250 higher than you",
    points: 25,
    condition: c => c.won && c.opponentRating - c.rating >= 250,
  },
  {
    scope: "player",
    id: "goliath",
    title: "Goliath",
    description:
      "Lose a game against opponents rated at least 250 lower than you",
    points: 10,
    condition: c => c.lost && c.rating - c.opponentRating >= 250,
  },
  // ----- personal: the score of one match
  {
    scope: "player",
    id: "diff-max",
    title: "Dominator",
    description: "Win while your opponents score 0",
    points: 25,
    condition: c => c.won && c.goalsAgainst === 0,
  },
  {
    scope: "player",
    id: "diff-min",
    title: "Das tapfere Schneiderlein",
    description: "Lose without scoring a goal",
    points: 10,
    condition: c => c.lost && c.goalsFor === 0,
  },
  // ----- personal: a busy day
  {
    scope: "player",
    id: "daily-matches-5",
    title: "No-stress-day",
    description: "Play 5 matches in a single day",
    points: 10,
    condition: c => c.day.matches >= 5,
  },
  {
    scope: "player",
    id: "daily-matches-10",
    title: "Are you even working?",
    description: "Play 10 matches in a single day",
    points: 25,
    condition: c => c.day.matches >= 10,
  },
  {
    scope: "player",
    id: "daily-wins-5",
    title: "Probably getting paid for this",
    description: "Win 5 matches in a single day",
    points: 15,
    condition: c => c.day.wins >= 5,
  },
  {
    scope: "player",
    id: "daily-wins-10",
    title: "Suffering from success",
    description: "Win 10 matches in a single day",
    points: 50,
    condition: c => c.day.wins >= 10,
  },
  // ----- personal: the calendar
  {
    scope: "player",
    id: "daily-o-clock",
    title: "No daily today?",
    description: "Play a match between 09:00 and 09:15",
    points: 10,
    condition: c => hour(c) === 9 && c.match.createdAt.getMinutes() <= 15,
  },
  {
    scope: "player",
    id: "night-match",
    title: "Night shift",
    description: "Play a match between 20:00 and 06:59",
    points: 25,
    condition: c => hour(c) >= 20 || hour(c) <= 6,
  },
  {
    scope: "player",
    id: "weekend-match",
    title: "Everyday is work day",
    description: "Play a match on a weekend",
    points: 25,
    condition: c => dayOfWeek(c) === 0 || dayOfWeek(c) === 6,
  },
  {
    scope: "player",
    id: "hangover",
    title: "Berliner Luft",
    description: "Play a match on a thursday",
    points: 10,
    condition: c => dayOfWeek(c) === 4,
  },
  {
    scope: "player",
    id: "xmas-match",
    title: "Merry Christmas",
    description: "Play a game on Christmas eve (24.12.)",
    points: 25,
    condition: c => onDate(c, 11, 24),
  },
  {
    scope: "player",
    id: "trick-or-treat",
    title: "Trick or treat",
    description: "Play on 31.10.",
    points: 25,
    condition: c => onDate(c, 9, 31),
  },
  {
    scope: "player",
    id: "leap-year",
    title: "Take a leap",
    description: "Play on 29.2",
    points: 50,
    condition: c => onDate(c, 1, 29),
  },
  {
    scope: "player",
    id: "vacation",
    title: "Back from vacation",
    description: "Play again after 14 days without a match",
    points: 10,
    condition: c => c.daysAway !== null && c.daysAway > 14,
  },

  // ----- team (pairs): matches and wins together
  {
    scope: "team",
    id: "duo-wins-1",
    title: "Dynamic duo",
    description: "Win your first match together",
    points: 5,
    condition: c => c.career.wins >= 1,
  },
  {
    scope: "team",
    id: "duo-wins-10",
    title: "Partners in crime",
    description: "Win 10 matches together",
    points: 10,
    condition: c => c.career.wins >= 10,
  },
  {
    scope: "team",
    id: "duo-wins-50",
    title: "Dream team",
    description: "Win 50 matches together",
    points: 25,
    condition: c => c.career.wins >= 50,
  },
  {
    scope: "team",
    id: "duo-wins-100",
    title: "Unstoppable",
    description: "Win 100 matches together",
    points: 50,
    condition: c => c.career.wins >= 100,
  },
  {
    scope: "team",
    id: "duo-matches-10",
    title: "Better together",
    description: "Play 10 matches together",
    points: 5,
    condition: c => c.career.matches >= 10,
  },
  {
    scope: "team",
    id: "duo-matches-50",
    title: "Inseparable",
    description: "Play 50 matches together",
    points: 10,
    condition: c => c.career.matches >= 50,
  },
  {
    scope: "team",
    id: "duo-matches-100",
    title: "Old married couple",
    description: "Play 100 matches together",
    points: 25,
    condition: c => c.career.matches >= 100,
  },
  // ----- team (pairs): the team rating, within a season
  {
    scope: "team",
    id: "duo-elo-100",
    title: "Chemistry",
    description: `Reach a team rating of ${defaultRating + 100}`,
    points: 10,
    condition: c => c.season.highestRating >= defaultRating + 100,
  },
  {
    scope: "team",
    id: "duo-elo-200",
    title: "Perfect harmony",
    description: `Reach a team rating of ${defaultRating + 200}`,
    points: 25,
    condition: c => c.season.highestRating >= defaultRating + 200,
  },
  {
    scope: "team",
    id: "duo-elo-300",
    title: "Legendary duo",
    description: `Reach a team rating of ${defaultRating + 300}`,
    points: 50,
    condition: c => c.season.highestRating >= defaultRating + 300,
  },
  // ----- team (pairs): streaks and upsets
  {
    scope: "team",
    id: "duo-streak-5",
    title: "In sync",
    description: "Win 5 matches in a row together",
    points: 15,
    condition: c => c.season.winStreak >= 5,
  },
  {
    scope: "team",
    id: "duo-streak-10",
    title: "Telepathy",
    description: "Win 10 matches in a row together",
    points: 50,
    condition: c => c.season.winStreak >= 10,
  },
  {
    scope: "team",
    id: "duo-upset",
    title: "Giant killers",
    description: "Win against a pair rated at least 200 higher than yours",
    points: 25,
    condition: c => c.won && c.opponentRating - c.rating >= 200,
  },
];

export const playerAchievements = achievements.filter(
  (a): a is PlayerAchievement => a.scope === "player",
);
export const teamAchievements = achievements.filter(
  (a): a is TeamAchievementDef => a.scope === "team",
);

/** Total points of a list of earned achievements (each achievement counts once). */
export function achievementPoints(earned: Array<{ achievement: string }>) {
  return [...new Set(earned.map(a => a.achievement))].reduce(
    (sum, id) => sum + (achievements.find(a => a.id === id)?.points ?? 0),
    0,
  );
}

/** One achievement earned by a player or a team, in a given match. */
export interface Earned {
  scope: Scope;
  /** a player's key, or a team's name ("anna,ben") */
  subject: string;
  achievement: string;
  matchId: number;
  season: number;
  createdAt: Date;
}

/** The fields of a match that achievements are derived from. */
export interface AchievementMatch {
  id: number;
  createdAt: Date | string;
  season: number;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  team1Rating: number;
  team2Rating: number;
  team1RatingChange: number;
  team2RatingChange: number;
}

interface PlayerSeason {
  highest: number;
  lowest: number;
  winStreak: number;
  bestWinStreak: number;
  losingStreak: number;
  bestLosingStreak: number;
}
interface PlayerState {
  matches: number;
  wins: number;
  goals: number;
  lastAt: Date | null;
  day: { at: Date; matches: number; wins: number } | null;
  seasons: Map<number, PlayerSeason>;
}
interface TeamState {
  matches: number;
  wins: number;
  seasons: Map<number, { highest: number; winStreak: number; best: number }>;
}

const DAY = 86_400_000;
const average = (values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Replays every match in order and returns what each player and each pair has earned and
 * when, oldest first. Pure: the same matches always give the same result.
 */
export function computeAchievements(matches: AchievementMatch[]): Earned[] {
  const ordered = matches
    .map(m => ({ ...m, createdAt: new Date(m.createdAt) }))
    .sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
    );

  // every player's own rating before and after each match (ratings are per season)
  const bySeason = new Map<number, typeof ordered>();
  for (const m of ordered) {
    bySeason.set(m.season, [...(bySeason.get(m.season) ?? []), m]);
  }
  const ratingBefore = new Map<string, number>();
  const ratingAfter = new Map<string, number>();
  for (const list of bySeason.values()) {
    for (const p of computePlayerStats(list)) {
      for (const h of p.history) {
        ratingBefore.set(`${h.matchId}|${p.name}`, h.rating - h.change);
        ratingAfter.set(`${h.matchId}|${p.name}`, h.rating);
      }
    }
  }

  const players = new Map<string, PlayerState>();
  const teams = new Map<string, TeamState>();
  const done = new Set<string>();
  const out: Earned[] = [];
  const earn = (
    scope: Scope,
    subject: string,
    id: string,
    m: (typeof ordered)[number],
  ) => {
    done.add(`${scope}|${subject}|${id}`);
    out.push({
      scope,
      subject,
      achievement: id,
      matchId: m.id,
      season: m.season,
      createdAt: m.createdAt,
    });
  };

  for (const m of ordered) {
    const sides = [
      {
        team: m.team1,
        names: parsePlayers(m.team1),
        score: m.score1,
        against: m.score2,
        rating: m.team1Rating - m.team1RatingChange,
        after: m.team1Rating,
        otherRating: m.team2Rating - m.team2RatingChange,
        otherNames: parsePlayers(m.team2),
      },
      {
        team: m.team2,
        names: parsePlayers(m.team2),
        score: m.score2,
        against: m.score1,
        rating: m.team2Rating - m.team2RatingChange,
        after: m.team2Rating,
        otherRating: m.team1Rating - m.team1RatingChange,
        otherNames: parsePlayers(m.team1),
      },
    ];
    if (sides.some(s => s.names.length === 0)) continue;
    // a player can't play against themselves (same rule as the player statistics)
    if (sides[0].names.some(n => sides[1].names.includes(n))) continue;

    for (const side of sides) {
      const won = side.score > side.against;
      const lost = side.score < side.against;
      const opponentRating = average(
        side.otherNames.map(
          n => ratingBefore.get(`${m.id}|${n}`) ?? defaultRating,
        ),
      );

      for (const name of side.names) {
        let s = players.get(name);
        if (!s) {
          s = {
            matches: 0,
            wins: 0,
            goals: 0,
            lastAt: null,
            day: null,
            seasons: new Map(),
          };
          players.set(name, s);
        }
        const daysAway = s.lastAt
          ? Math.floor((m.createdAt.getTime() - s.lastAt.getTime()) / DAY)
          : null;
        s.matches += 1;
        s.wins += won ? 1 : 0;
        s.goals += side.score;
        s.lastAt = m.createdAt;
        s.day =
          s.day && isSameLocalDay(s.day.at, m.createdAt)
            ? {
                at: m.createdAt,
                matches: s.day.matches + 1,
                wins: s.day.wins + (won ? 1 : 0),
              }
            : { at: m.createdAt, matches: 1, wins: won ? 1 : 0 };
        let ps = s.seasons.get(m.season);
        if (!ps) {
          ps = {
            highest: defaultRating,
            lowest: defaultRating,
            winStreak: 0,
            bestWinStreak: 0,
            losingStreak: 0,
            bestLosingStreak: 0,
          };
          s.seasons.set(m.season, ps);
        }
        const after = ratingAfter.get(`${m.id}|${name}`) ?? defaultRating;
        ps.highest = Math.max(ps.highest, after);
        ps.lowest = Math.min(ps.lowest, after);
        ps.winStreak = won ? ps.winStreak + 1 : 0;
        ps.losingStreak = lost ? ps.losingStreak + 1 : 0;
        ps.bestWinStreak = Math.max(ps.bestWinStreak, ps.winStreak);
        ps.bestLosingStreak = Math.max(ps.bestLosingStreak, ps.losingStreak);

        const context: PlayerContext = {
          match: { id: m.id, createdAt: m.createdAt, season: m.season },
          won,
          lost,
          career: { matches: s.matches, wins: s.wins, goals: s.goals },
          season: {
            highestRating: ps.highest,
            lowestRating: ps.lowest,
            winStreak: ps.bestWinStreak,
            losingStreak: ps.bestLosingStreak,
          },
          day: { matches: s.day.matches, wins: s.day.wins },
          rating: ratingBefore.get(`${m.id}|${name}`) ?? defaultRating,
          opponentRating,
          goalsFor: side.score,
          goalsAgainst: side.against,
          daysAway,
        };
        for (const a of playerAchievements) {
          if (!done.has(`player|${name}|${a.id}`) && a.condition(context)) {
            earn("player", name, a.id, m);
          }
        }
      }

      // a pair (two or more players) also earns as a team
      if (side.names.length < 2) continue;
      let t = teams.get(side.team);
      if (!t) {
        t = { matches: 0, wins: 0, seasons: new Map() };
        teams.set(side.team, t);
      }
      t.matches += 1;
      t.wins += won ? 1 : 0;
      let ts = t.seasons.get(m.season);
      if (!ts) {
        ts = { highest: defaultRating, winStreak: 0, best: 0 };
        t.seasons.set(m.season, ts);
      }
      ts.highest = Math.max(ts.highest, side.after);
      ts.winStreak = won ? ts.winStreak + 1 : 0;
      ts.best = Math.max(ts.best, ts.winStreak);
      const context: TeamContext = {
        match: { id: m.id, createdAt: m.createdAt, season: m.season },
        won,
        career: { matches: t.matches, wins: t.wins },
        season: { highestRating: ts.highest, winStreak: ts.best },
        rating: side.rating,
        opponentRating: side.otherRating,
      };
      for (const a of teamAchievements) {
        if (!done.has(`team|${side.team}|${a.id}`) && a.condition(context)) {
          earn("team", side.team, a.id, m);
        }
      }
    }
  }
  return out;
}
