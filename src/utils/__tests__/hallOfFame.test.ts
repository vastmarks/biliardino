import { computeHallOfFame, SeasonMatch } from "~/utils/hallOfFame";

let id = 0;
const at = (day: number, hour = 12) => new Date(2027, 0, day, hour);
const m = (
  day: number,
  team1: string,
  score1: number,
  score2: number,
  team2: string,
  season = 1,
  hour = 12,
): SeasonMatch => ({
  id: ++id,
  createdAt: at(day, hour),
  team1,
  team2,
  score1,
  score2,
  season,
});

describe("computeHallOfFame", () => {
  beforeEach(() => {
    id = 0;
  });

  it("returns nothing for an empty history", () => {
    expect(computeHallOfFame([], [], 1)).toEqual({
      records: [],
      seasons: [],
      totalMatches: 0,
    });
  });

  it("finds the longest winning streak, the first to set it keeps the record", () => {
    const matches = [
      m(1, "anna", 10, 5, "bob"),
      m(2, "anna", 10, 5, "bob"),
      m(3, "anna", 10, 5, "bob"),
      m(4, "bob", 10, 5, "anna"),
      m(5, "bob", 10, 5, "anna"),
      m(6, "bob", 10, 5, "anna"),
    ];
    const streak = computeHallOfFame(matches, [], 1).records.find(
      r => r.key === "winStreak",
    );
    expect(streak).toMatchObject({ players: ["anna"], value: 3, date: at(3) });
  });

  it("finds the biggest win with its score and both sides", () => {
    const matches = [
      m(1, "anna,bob", 10, 4, "carl,dan"),
      m(2, "carl,dan", 10, 0, "anna,bob"),
      m(3, "anna", 10, 0, "carl"),
    ];
    const win = computeHallOfFame(matches, [], 1).records.find(
      r => r.key === "biggestWin",
    );
    expect(win).toMatchObject({
      players: ["carl", "dan"],
      opponents: ["anna", "bob"],
      value: 10,
      detail: { score: 10, other: 0 },
      date: at(2),
    });
  });

  it("counts the most matches one player played in a single day (at least 3)", () => {
    const one = computeHallOfFame(
      [m(1, "anna", 10, 5, "bob"), m(1, "anna", 10, 5, "bob")],
      [],
      1,
    );
    expect(one.records.find(r => r.key === "marathon")).toBeUndefined();
    const four = computeHallOfFame(
      [1, 2, 3, 4]
        .map(h => m(1, "anna", 10, 5, h % 2 ? "bob" : "carl", 1, 9 + h))
        .concat(m(2, "bob", 10, 5, "carl")),
      [],
      1,
    );
    expect(four.records.find(r => r.key === "marathon")).toMatchObject({
      players: ["anna"],
      value: 4,
    });
  });

  it("gives most wins only to players with enough matches, fewer matches wins a tie", () => {
    const matches = [
      ...[1, 2, 3, 4, 5, 6].map(d => m(d, "anna", 10, 5, "bob")),
      ...[7, 8, 9, 10, 11, 12].map(d => m(d, "carl", 10, 5, "dan")),
      m(13, "dan", 10, 5, "carl"),
    ];
    const wins = computeHallOfFame(matches, [], 1).records.find(
      r => r.key === "mostWins",
    );
    expect(wins).toMatchObject({
      players: ["anna"],
      value: 6,
      detail: { matches: 6 },
    });
  });

  it("names a season champion only past the provisional matches, marks the current season", () => {
    const s1 = [1, 2, 3, 4, 5].map(d => m(d, "anna", 10, 5, "bob", 1));
    const s2 = [m(10, "carl", 10, 5, "anna", 2)];
    const hof = computeHallOfFame([...s1, ...s2], [], 2);
    expect(hof.seasons.map(s => s.season)).toEqual([2, 1]);
    expect(hof.seasons[1]).toMatchObject({
      current: false,
      matches: 5,
      champion: { player: "anna", wins: 5, losses: 0 },
    });
    expect(hof.seasons[0]).toMatchObject({
      current: true,
      matches: 1,
      champion: undefined,
    });
    expect(hof.totalMatches).toBe(6);
  });

  it("takes the best pair of each season from the team ratings", () => {
    const pairs = [
      {
        name: "anna,bob",
        teamsize: 2,
        meta: [
          {
            season: 1,
            rating: 1040,
            totalMatches: 3,
            totalWins: 3,
            totalLosses: 0,
          },
        ],
      },
      {
        name: "carl,dan",
        teamsize: 2,
        meta: [
          {
            season: 1,
            rating: 960,
            totalMatches: 3,
            totalWins: 0,
            totalLosses: 3,
          },
        ],
      },
    ];
    const hof = computeHallOfFame(
      [m(1, "anna,bob", 10, 5, "carl,dan")],
      pairs,
      1,
    );
    expect(hof.seasons[0].pair).toEqual({
      players: ["anna", "bob"],
      rating: 1040,
    });
  });

  it("records the peak rating after the provisional matches and the biggest upset", () => {
    // anna wins a lot and becomes strong; then dan (new, 1000) beats her
    const matches = [
      ...[1, 2, 3, 4, 5, 6, 7].map(d =>
        m(d, "anna", 10, 5, d % 2 ? "bob" : "carl"),
      ),
      m(8, "dan", 10, 8, "anna"),
    ];
    const { records } = computeHallOfFame(matches, [], 1);
    const peak = records.find(r => r.key === "peakRating")!;
    expect(peak.players).toEqual(["anna"]);
    expect(peak.date).toEqual(at(7));
    expect(peak.value).toBeGreaterThan(1080);
    const upset = records.find(r => r.key === "biggestUpset")!;
    expect(upset).toMatchObject({
      players: ["dan"],
      opponents: ["anna"],
      detail: { score: 10, other: 8 },
      date: at(8),
    });
    expect(upset.value).toBeGreaterThanOrEqual(80);
  });

  it("lists the records in a fixed order", () => {
    const matches = [
      ...[1, 2, 3, 4, 5, 6, 7].map(d =>
        m(d, "anna", 10, 5, d % 2 ? "bob" : "carl"),
      ),
      m(8, "dan", 10, 0, "anna"),
    ];
    const keys = computeHallOfFame(matches, [], 1).records.map(r => r.key);
    expect(keys).toEqual([
      "peakRating",
      "winStreak",
      "mostWins",
      "biggestWin",
      "biggestUpset",
    ]);
  });
});

describe("reigning champions", () => {
  const team = (name: string, season: number, rating: number) => ({
    name,
    teamsize: name.split(",").length,
    meta: [{ season, rating, totalMatches: 4, totalWins: 3, totalLosses: 1 }],
  });

  it("are the 1v1 and 2v2 winners of the last season that has ended", () => {
    const matches = [
      m(1, "anna", 10, 5, "bob", 1),
      m(2, "anna,bob", 10, 5, "carl,dan", 1),
      m(40, "carl", 10, 5, "anna", 2),
    ];
    const teams = [
      team("anna", 1, 1040),
      team("bob", 1, 960),
      team("anna,bob", 1, 1030),
      team("carl,dan", 1, 970),
      team("carl", 2, 1016),
    ];
    const hof = computeHallOfFame(matches, teams, 2);
    expect(hof.reigning).toMatchObject({
      season: 1,
      single: { player: "anna", rating: 1040 },
      pair: { players: ["anna", "bob"], rating: 1030 },
    });
    expect(hof.seasons[0]).toMatchObject({
      season: 2,
      current: true,
      single: { player: "carl" },
    });
  });

  it("don't exist while the first season is running", () => {
    const hof = computeHallOfFame([m(1, "anna", 10, 5, "bob", 1)], [], 1);
    expect(hof.reigning).toBeUndefined();
  });
});
