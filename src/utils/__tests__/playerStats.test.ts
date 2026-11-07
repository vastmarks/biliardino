import {
  computePlayerStats,
  computeStatsForPlayer,
  parsePlayers,
  MatchLike,
} from "~/utils/playerStats";

let id = 0;
const m = (
  team1: string,
  team2: string,
  score1: number,
  score2: number,
): MatchLike => ({
  id: ++id,
  createdAt: new Date(2026, 0, 1, 12, id),
  team1,
  team2,
  score1,
  score2,
});

describe("parsePlayers", () => {
  it("splits, trims, lowercases and de-duplicates", () => {
    expect(parsePlayers(" Anna , marco,ANNA ,")).toEqual(["anna", "marco"]);
  });
});

describe("computePlayerStats", () => {
  beforeEach(() => {
    id = 0;
  });

  it("returns nothing for no matches", () => {
    expect(computePlayerStats([])).toEqual([]);
  });

  it("1v1: winner gains what the loser loses (equal ratings, K=32)", () => {
    const stats = computePlayerStats([m("anna", "luca", 10, 4)]);
    const anna = stats.find(p => p.name === "anna")!;
    const luca = stats.find(p => p.name === "luca")!;
    expect(anna.rating).toBeCloseTo(1016);
    expect(luca.rating).toBeCloseTo(984);
    expect(stats[0].name).toBe("anna");
    expect(anna).toMatchObject({ matches: 1, wins: 1, losses: 0, winRate: 1 });
    expect(anna.goalsFor).toBe(10);
    expect(anna.goalsAgainst).toBe(4);
    expect(anna.goalDifference).toBe(6);
    expect(luca).toMatchObject({ matches: 1, wins: 0, losses: 1, winRate: 0 });
  });

  it("2v2: every player of a side gets the same change, ratings are conserved", () => {
    const stats = computePlayerStats([m("anna,marco", "luca,sara", 10, 7)]);
    const r = (n: string) => stats.find(p => p.name === n)!.rating;
    expect(r("anna")).toBeCloseTo(1016);
    expect(r("marco")).toBeCloseTo(1016);
    expect(r("luca")).toBeCloseTo(984);
    expect(r("sara")).toBeCloseTo(984);
    expect(stats.reduce((s, p) => s + p.rating, 0)).toBeCloseTo(4000);
  });

  it("uses the side average, so beating a stronger side pays more", () => {
    const stats = computePlayerStats([
      m("anna", "luca", 10, 0), // anna 1016, luca 984
      m("luca", "anna", 10, 0), // upset-ish: luca (lower) beats anna (higher)
    ]);
    const anna = stats.find(p => p.name === "anna")!;
    const luca = stats.find(p => p.name === "luca")!;
    // luca was the underdog in match 2, so he gains more than 16
    expect(luca.rating).toBeGreaterThan(1000);
    expect(anna.rating).toBeLessThan(1000 + 16);
    expect(anna.rating + luca.rating).toBeCloseTo(2000);
  });

  it("tracks partners, opponents and formats", () => {
    const stats = computePlayerStats([
      m("anna,marco", "luca,sara", 10, 7),
      m("anna,marco", "luca,sara", 3, 10),
      m("anna", "marco", 10, 9),
    ]);
    const anna = stats.find(p => p.name === "anna")!;
    expect(anna.partners).toEqual([
      expect.objectContaining({
        player: "marco",
        matches: 2,
        wins: 1,
        losses: 1,
        winRate: 0.5,
      }),
    ]);
    expect(anna.opponents.map(o => [o.player, o.matches])).toEqual([
      ["luca", 2],
      ["sara", 2],
      ["marco", 1],
    ]);
    expect(anna.formats["2v2"]).toMatchObject({
      matches: 2,
      wins: 1,
      losses: 1,
    });
    expect(anna.formats["1v1"]).toMatchObject({
      matches: 1,
      wins: 1,
      losses: 0,
    });
  });

  it("supports uneven sides without special casing", () => {
    const stats = computePlayerStats([m("anna,marco", "luca", 10, 5)]);
    expect(stats.find(p => p.name === "luca")!.formats["1v2"]).toMatchObject({
      matches: 1,
      losses: 1,
    });
    expect(stats.reduce((s, p) => s + p.rating, 0)).toBeGreaterThan(2999);
  });

  it("computes streaks and treats a draw as half a win that breaks streaks", () => {
    const stats = computePlayerStats([
      m("anna", "luca", 10, 1),
      m("anna", "luca", 10, 1),
      m("anna", "luca", 10, 1),
      m("anna", "luca", 5, 10),
      m("anna", "luca", 5, 5),
    ]);
    const anna = stats.find(p => p.name === "anna")!;
    expect(anna.longestWinStreak).toBe(3);
    expect(anna.longestLosingStreak).toBe(1);
    expect(anna.currentStreak).toEqual({ type: "D", length: 1 });
    expect(anna.draws).toBe(1);
    expect(anna.history).toHaveLength(5);
    expect(anna.history[0].change).toBeCloseTo(16);
  });

  it("is independent of input order and replays chronologically", () => {
    const list = [
      m("anna", "luca", 10, 1),
      m("luca", "anna", 10, 2),
      m("anna", "luca", 10, 3),
    ];
    const a = computePlayerStats(list);
    const b = computePlayerStats([...list].reverse());
    expect(b.map(p => [p.name, p.rating])).toEqual(
      a.map(p => [p.name, p.rating]),
    );
  });

  it("ignores malformed matches (empty side, same player on both sides)", () => {
    expect(
      computePlayerStats([m("", "luca", 1, 0), m("anna", "anna,luca", 1, 0)]),
    ).toEqual([]);
  });

  it("flags players with few matches as provisional", () => {
    const stats = computePlayerStats([m("anna", "luca", 10, 1)]);
    expect(stats.every(p => p.provisional)).toBe(true);
  });
});

describe("computeStatsForPlayer", () => {
  it("finds a player case-insensitively, null if unknown", () => {
    const list = [m("anna", "luca", 10, 1)];
    expect(computeStatsForPlayer(list, " Anna ")?.name).toBe("anna");
    expect(computeStatsForPlayer(list, "nobody")).toBeNull();
  });
});
