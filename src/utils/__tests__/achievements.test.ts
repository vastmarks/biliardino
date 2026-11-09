import {
  Achievement,
  achievementPoints,
  achievements,
  computeAchievements,
  Earned,
} from "~/utils/achievements";
import { replaySeason } from "~/utils/teamStats";

/** A match to play: sides are lists of player keys; the date defaults to a Monday morning. */
interface Play {
  a: string[];
  b: string[];
  sa?: number;
  sb?: number;
  at?: Date;
  season?: number;
}

const monday = (minutes: number) => new Date(2026, 2, 2, 10, minutes);

/** Runs the matches through the real rating replay, then derives the achievements. */
function play(list: Play[]): Earned[] {
  const matches = list.map((p, i) => ({
    id: i + 1,
    createdAt: p.at ?? monday(i),
    season: p.season ?? 1,
    team1: [...p.a].sort().join(","),
    team2: [...p.b].sort().join(","),
    score1: p.sa ?? 10,
    score2: p.sb ?? 5,
  }));
  const ratings = new Map<number, ReturnType<typeof replaySeason>["matches"]>();
  for (const season of new Set(matches.map(m => m.season))) {
    ratings.set(
      season,
      replaySeason(matches.filter(m => m.season === season)).matches,
    );
  }
  return computeAchievements(
    matches.map(m => ({ ...m, ...ratings.get(m.season)!.get(m.id)! })),
  );
}

const has = (
  earned: Earned[],
  scope: "player" | "team",
  subject: string,
  id: string,
) =>
  earned.some(
    e => e.scope === scope && e.subject === subject && e.achievement === id,
  );
const get = (
  earned: Earned[],
  scope: "player" | "team",
  subject: string,
  id: string,
) =>
  earned.find(
    e => e.scope === scope && e.subject === subject && e.achievement === id,
  );
const wins = (n: number, a = ["anna"], b = ["ben"], season = 1): Play[] =>
  Array.from({ length: n }, () => ({ a, b, season }));

describe("definitions", () => {
  test("every achievement has a unique id and positive points", () => {
    const ids = achievements.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of achievements) expect(a.points).toBeGreaterThan(0);
  });

  test("harder milestones are worth more", () => {
    const byId = (id: string): Achievement =>
      achievements.find(a => a.id === id)!;
    for (const ladder of [
      ["wins-1", "wins-10", "wins-50", "wins-100", "wins-500", "wins-1000"],
      [
        "matches-1",
        "matches-10",
        "matches-50",
        "matches-100",
        "matches-500",
        "matches-1000",
      ],
      [
        "score-1",
        "score-10",
        "score-100",
        "score-1000",
        "score-2500",
        "score-5000",
      ],
      ["elo-100", "elo-200", "elo-300", "elo-400", "elo-500"],
      ["consecutive-wins-5", "consecutive-wins-10"],
      ["daily-wins-5", "daily-wins-10"],
      ["daily-matches-5", "daily-matches-10"],
      ["duo-wins-1", "duo-wins-10", "duo-wins-50", "duo-wins-100"],
      ["duo-matches-10", "duo-matches-50", "duo-matches-100"],
      ["duo-elo-100", "duo-elo-200", "duo-elo-300"],
      ["duo-streak-5", "duo-streak-10"],
    ]) {
      const pts = ladder.map(id => byId(id).points);
      expect(pts).toEqual([...pts].sort((a, b) => a - b));
    }
  });

  test("points add up each achievement once", () => {
    const first = achievements.find(a => a.id === "wins-1")!.points;
    const tenth = achievements.find(a => a.id === "wins-10")!.points;
    expect(
      achievementPoints([
        { achievement: "wins-1" },
        { achievement: "wins-1" },
        { achievement: "wins-10" },
        { achievement: "no-longer-exists" },
      ]),
    ).toBe(first + tenth);
  });
});

describe("personal achievements", () => {
  test("both players of a side earn them, each on their own count", () => {
    const earned = play([{ a: ["anna", "ben"], b: ["carla", "dario"] }]);
    for (const p of ["anna", "ben"]) {
      expect(has(earned, "player", p, "wins-1")).toBe(true);
      expect(has(earned, "player", p, "matches-1")).toBe(true);
    }
    for (const p of ["carla", "dario"]) {
      expect(has(earned, "player", p, "wins-1")).toBe(false);
      expect(has(earned, "player", p, "matches-1")).toBe(true);
    }
  });

  test("milestones add up across formats and partners", () => {
    const earned = play([
      ...wins(4, ["anna"], ["ben"]), // 1v1
      ...wins(3, ["anna", "carla"], ["ben", "dario"]), // with Carla
      ...wins(3, ["anna", "dario"], ["ben", "carla"]), // with Dario
    ]);
    const ten = get(earned, "player", "anna", "wins-10")!;
    expect(ten.matchId).toBe(10);
    // Carla only won 3 of her own, Dario 3
    expect(has(earned, "player", "carla", "wins-10")).toBe(false);
    expect(has(earned, "player", "dario", "wins-10")).toBe(false);
  });

  test("each is earned once, in the match that did it", () => {
    const earned = play(wins(12));
    expect(earned.filter(e => e.achievement === "wins-1")).toHaveLength(1);
    expect(get(earned, "player", "anna", "wins-1")!.matchId).toBe(1);
    expect(get(earned, "player", "anna", "wins-10")!.matchId).toBe(10);
    const keys = earned.map(e => `${e.scope}|${e.subject}|${e.achievement}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("milestones count all seasons, ratings and streaks one season", () => {
    const six = (season: number) => wins(6, ["anna"], ["ben"], season);
    const earned = play([...six(1), ...six(2)]);
    // 12 wins over two seasons: the milestone counts them all
    expect(has(earned, "player", "anna", "wins-10")).toBe(true);
    // a streak of 6 inside one season counts for the streak of 5
    expect(has(earned, "player", "anna", "consecutive-wins-5")).toBe(true);
    // a streak split over two seasons doesn't count
    const split = play([
      ...wins(3, ["anna"], ["ben"], 1),
      ...wins(3, ["anna"], ["ben"], 2),
    ]);
    expect(has(split, "player", "anna", "consecutive-wins-5")).toBe(false);
    expect(has(split, "player", "anna", "wins-1")).toBe(true);
  });

  test("goals: every player of a side gets the side's goals", () => {
    const earned = play([
      { a: ["anna", "ben"], b: ["carla", "dario"], sa: 10, sb: 7 },
    ]);
    // 10 goals each for the winners
    expect(has(earned, "player", "anna", "score-10")).toBe(true);
    expect(has(earned, "player", "ben", "score-10")).toBe(true);
    expect(has(earned, "player", "carla", "score-10")).toBe(false);
  });

  test("the individual rating decides the rating achievements", () => {
    // Anna wins 15 times against changing 1v1 opponents: her rating climbs
    const earned = play(wins(15));
    expect(has(earned, "player", "anna", "elo-100")).toBe(true);
    expect(has(earned, "player", "ben", "elo-100")).toBe(false);
    expect(has(earned, "player", "ben", "elo-minus300")).toBe(false);
    // the same wins in 3 seasons never reach +100
    const spread = play([
      ...wins(5, ["anna"], ["ben"], 1),
      ...wins(5, ["anna"], ["ben"], 2),
      ...wins(5, ["anna"], ["ben"], 3),
    ]);
    expect(has(spread, "player", "anna", "elo-100")).toBe(false);
  });

  test("ratings before the match decide David and underdog", () => {
    // Ben beats Carla 30 times: he is clearly above her
    const earned = play([
      ...wins(30, ["ben"], ["carla"]),
      { a: ["carla"], b: ["ben"] }, // Carla wins against the much higher Ben
    ]);
    expect(has(earned, "player", "carla", "underdog")).toBe(true);
    expect(has(earned, "player", "carla", "david")).toBe(true);
    expect(has(earned, "player", "ben", "badday")).toBe(true);
    // equal players: neither
    const equal = play([{ a: ["anna"], b: ["ben"] }]);
    expect(has(equal, "player", "anna", "underdog")).toBe(false);
    expect(has(equal, "player", "ben", "badday")).toBe(false);
  });

  test("the score of one match", () => {
    const earned = play([{ a: ["anna"], b: ["ben"], sa: 10, sb: 0 }]);
    expect(has(earned, "player", "anna", "diff-max")).toBe(true);
    expect(has(earned, "player", "ben", "diff-min")).toBe(true);
    expect(has(earned, "player", "ben", "diff-max")).toBe(false);
  });

  test("a busy day, counted per player and per day", () => {
    const sameDay = play(wins(5));
    expect(has(sameDay, "player", "anna", "daily-matches-5")).toBe(true);
    expect(has(sameDay, "player", "anna", "daily-wins-5")).toBe(true);
    expect(has(sameDay, "player", "anna", "daily-matches-10")).toBe(false);
    const spread = play(
      Array.from({ length: 5 }, (_, i) => ({
        a: ["anna"],
        b: ["ben"],
        at: new Date(2026, 2, 2 + i, 10, 0),
      })),
    );
    expect(has(spread, "player", "anna", "daily-matches-5")).toBe(false);
  });

  test("the calendar", () => {
    const at = (d: Date) =>
      play([{ a: ["anna"], b: ["ben"], at: d }]).map(e => e.achievement);
    expect(at(new Date(2026, 2, 2, 22, 30))).toContain("night-match");
    expect(at(new Date(2026, 2, 3, 5, 0))).toContain("night-match");
    expect(at(new Date(2026, 2, 2, 14, 0))).not.toContain("night-match");
    expect(at(new Date(2026, 2, 5, 14, 0))).toContain("hangover"); // Thursday
    expect(at(new Date(2026, 2, 7, 14, 0))).toContain("weekend-match");
    expect(at(new Date(2026, 2, 2, 9, 10))).toContain("daily-o-clock");
    expect(at(new Date(2026, 2, 2, 9, 40))).not.toContain("daily-o-clock");
    expect(at(new Date(2026, 11, 24, 12, 0))).toContain("xmas-match");
    expect(at(new Date(2026, 9, 31, 12, 0))).toContain("trick-or-treat");
    expect(at(new Date(2028, 1, 29, 12, 0))).toContain("leap-year");
  });

  test("back from vacation after more than 14 days", () => {
    const earned = play([
      { a: ["anna"], b: ["ben"], at: new Date(2026, 2, 2, 10) },
      { a: ["anna"], b: ["ben"], at: new Date(2026, 2, 12, 10) },
      { a: ["anna"], b: ["carla"], at: new Date(2026, 2, 30, 10) },
    ]);
    const vacation = earned.filter(e => e.achievement === "vacation");
    expect(vacation.map(e => e.subject)).toEqual(["anna"]);
    expect(vacation[0].matchId).toBe(3);
  });

  test("goal milestones need as many goals as they say", () => {
    const goals = (n: number) =>
      play(
        Array.from({ length: Math.ceil(n / 10) }, () => ({
          a: ["anna"],
          b: ["ben"],
          sa: 10,
          sb: 0,
        })),
      );
    expect(has(goals(1000), "player", "anna", "score-1000")).toBe(true);
    expect(has(goals(990), "player", "anna", "score-1000")).toBe(false);
  });
});

describe("team achievements", () => {
  test("a single player earns no team achievements", () => {
    const earned = play(wins(12));
    expect(earned.some(e => e.scope === "team")).toBe(false);
  });

  test("only what the pair did together counts", () => {
    const earned = play([
      ...wins(6, ["anna", "ben"], ["carla", "dario"]),
      ...wins(6, ["anna", "carla"], ["ben", "dario"]),
    ]);
    // Anna has 12 wins of her own, but never 10 with one partner
    expect(has(earned, "player", "anna", "wins-10")).toBe(true);
    expect(has(earned, "team", "anna,ben", "duo-wins-1")).toBe(true);
    expect(has(earned, "team", "anna,carla", "duo-wins-1")).toBe(true);
    expect(has(earned, "team", "anna,ben", "duo-wins-10")).toBe(false);
    expect(has(earned, "team", "anna,carla", "duo-wins-10")).toBe(false);
    // the losing pair earns "matches together", not wins
    expect(has(earned, "team", "carla,dario", "duo-wins-1")).toBe(false);
  });

  test("wins and matches together, and a streak", () => {
    const earned = play(wins(10, ["anna", "ben"], ["carla", "dario"]));
    expect(get(earned, "team", "anna,ben", "duo-wins-10")!.matchId).toBe(10);
    expect(get(earned, "team", "anna,ben", "duo-matches-10")!.matchId).toBe(10);
    expect(get(earned, "team", "anna,ben", "duo-streak-5")!.matchId).toBe(5);
    expect(get(earned, "team", "anna,ben", "duo-streak-10")!.matchId).toBe(10);
    // team rating climbed
    expect(has(earned, "team", "anna,ben", "duo-elo-100")).toBe(true);
    expect(has(earned, "team", "carla,dario", "duo-elo-100")).toBe(false);
  });

  test("beating a much stronger pair", () => {
    const earned = play([
      ...wins(15, ["anna", "ben"], ["carla", "dario"]),
      { a: ["carla", "dario"], b: ["anna", "ben"] },
    ]);
    expect(has(earned, "team", "carla,dario", "duo-upset")).toBe(true);
    expect(has(earned, "team", "anna,ben", "duo-upset")).toBe(false);
  });
});

describe("derived from the matches", () => {
  test("correcting a match corrects what it earned", () => {
    const base: Play[] = [{ a: ["anna"], b: ["ben"], sa: 10, sb: 0 }];
    expect(has(play(base), "player", "anna", "diff-max")).toBe(true);
    // the score was entered wrong: it was 10:3
    const fixed = [{ ...base[0], sb: 3 }];
    expect(has(play(fixed), "player", "anna", "diff-max")).toBe(false);
    // and a deleted match earns nothing
    expect(play([])).toEqual([]);
  });
});
