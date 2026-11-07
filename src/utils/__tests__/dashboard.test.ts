import {
  computeDashboard,
  recentPlayerOrder,
  topPairs,
} from "~/utils/dashboard";
import type { MatchLike } from "~/utils/playerStats";

const NOW = new Date(2026, 10, 5, 15, 0); // Thu 5 Nov 2026, 15:00 local
const day = (offset: number, hour = 12, minute = 0) =>
  new Date(2026, 10, 5 - offset, hour, minute);
const starts = {
  today: new Date(2026, 10, 5),
  week: new Date(2026, 10, 5 - 6),
  month: new Date(2026, 10, 5 - 29),
};

let id = 0;
const m = (
  daysAgo: number,
  team1: string,
  team2: string,
  score1: number,
  score2: number,
  hour = 12,
): MatchLike => ({
  id: ++id,
  createdAt: day(daysAgo, hour, id % 50),
  team1,
  team2,
  score1,
  score2,
});

beforeEach(() => {
  id = 0;
});

describe("computeDashboard", () => {
  it("is empty without matches", () => {
    const d = computeDashboard([], starts);
    expect(d.boards.season).toEqual([]);
    expect(d.tiles).toEqual({
      streak: null,
      gain: null,
      upset: null,
      active: null,
    });
  });

  it("period boards only list players who played in the window, best gain first", () => {
    const d = computeDashboard(
      [
        m(20, "anna", "luca", 10, 2), // month only
        m(3, "marco", "luca", 10, 4), // week
        m(0, "anna", "sara", 10, 5), // today
      ],
      starts,
    );
    expect(d.boards.today.map(r => r.name)).toEqual(["anna", "sara"]);
    expect(d.boards.week.map(r => r.name).sort()).toEqual([
      "anna",
      "luca",
      "marco",
      "sara",
    ]);
    expect(d.boards.month.map(r => r.name).sort()).toEqual([
      "anna",
      "luca",
      "marco",
      "sara",
    ]);
    expect(d.boards.season).toHaveLength(4);
    // anna: +16 (month match, vs equal rating), then 1016 vs sara 1000 => a bit less than +16 today
    const annaToday = d.boards.today.find(r => r.name === "anna")!;
    expect(annaToday.matches).toBe(1);
    expect(annaToday.delta).toBeGreaterThan(10);
    expect(annaToday.delta).toBeLessThan(16);
    expect(d.boards.today[0].name).toBe("anna");
    expect(d.boards.today[1].delta).toBeLessThan(0);
    // today's rating is still the current season rating, not a window rating
    expect(annaToday.rating).toBeCloseTo(1000 + 16 + annaToday.delta, 5);
  });

  it("window deltas add up to the season delta", () => {
    const list = [
      m(10, "anna", "luca", 10, 3),
      m(2, "luca", "anna", 10, 9),
      m(0, "anna", "luca", 10, 1),
    ];
    const d = computeDashboard(list, starts);
    const season = d.boards.season.find(r => r.name === "anna")!;
    const month = d.boards.month.find(r => r.name === "anna")!;
    expect(month.delta).toBeCloseTo(season.delta, 6);
    expect(season.delta).toBeCloseTo(season.rating - 1000, 6);
  });

  it("season board ranks players with 5+ matches first, then placement players", () => {
    const list: MatchLike[] = [];
    for (let i = 0; i < 5; i++) list.push(m(15 - i, "vet", "bob", 10, 5));
    list.push(m(1, "newbie", "ann", 10, 0)); // 1 match each, high delta
    const d = computeDashboard(list, starts);
    const names = d.boards.season.map(r => r.name);
    expect(names.slice(0, 2).sort()).toEqual(["bob", "vet"]);
    expect(
      d.boards.season
        .filter(r => r.placement)
        .map(r => r.name)
        .sort(),
    ).toEqual(["ann", "newbie"]);
    expect(d.boards.season.find(r => r.name === "vet")!.placement).toBe(false);
  });

  it("form is the last 5 results, oldest first", () => {
    const list = [10, 9, 8, 7, 6, 5, 4].map((d, i) =>
      i % 2 === 0 ? m(d, "anna", "luca", 10, 3) : m(d, "anna", "luca", 3, 10),
    );
    const row = computeDashboard(list, starts).boards.season.find(
      r => r.name === "anna",
    )!;
    expect(row.form).toHaveLength(5);
    // matches 3..7 => indexes 2..6 => W L W L W
    expect(row.form).toEqual(["W", "L", "W", "L", "W"]);
  });

  it("reports rank movement against the standings before the week window", () => {
    const list: MatchLike[] = [];
    // before the week: a leads, b second, c third (each 5+ matches via repeated results)
    for (let i = 0; i < 5; i++) list.push(m(20 - i, "a", "x", 10, 0));
    for (let i = 0; i < 5; i++) list.push(m(14 - i, "b", "x", 10, 0));
    // this week: c wins a lot and overtakes
    for (let i = 0; i < 6; i++)
      list.push(m(5 - Math.min(i, 4), "c", "x", 10, 0));
    const d = computeDashboard(list, starts);
    const c = d.boards.season.find(r => r.name === "c")!;
    expect(c.isNew).toBe(true);
    expect(c.rankChange).toBeNull();
    const a = d.boards.season.find(r => r.name === "a")!;
    expect(a.isNew).toBe(false);
    expect(typeof a.rankChange).toBe("number");
  });

  it("has no rank movement when everything happened inside the window", () => {
    const d = computeDashboard([m(1, "anna", "luca", 10, 1)], starts);
    expect(d.boards.season.every(r => r.rankChange === null && !r.isNew)).toBe(
      true,
    );
  });

  describe("tiles", () => {
    it("hot streak needs 3 wins in a row", () => {
      const two = computeDashboard(
        [m(3, "anna", "luca", 10, 1), m(2, "anna", "luca", 10, 1)],
        starts,
      );
      expect(two.tiles.streak).toBeNull();
      const three = computeDashboard(
        [
          m(4, "anna", "luca", 10, 1),
          m(3, "anna", "luca", 10, 1),
          m(2, "anna", "luca", 10, 1),
        ],
        starts,
      );
      expect(three.tiles.streak).toEqual({ player: "anna", length: 3 });
    });

    it("rising: biggest positive rating gain this week", () => {
      const d = computeDashboard(
        [
          m(20, "anna", "luca", 10, 1),
          m(2, "marco", "sara", 10, 2),
          m(1, "marco", "sara", 10, 2),
        ],
        starts,
      );
      expect(d.tiles.gain?.player).toBe("marco");
      expect(d.tiles.gain!.delta).toBeGreaterThan(20);
      expect(d.tiles.gain!.matches).toBe(2);
    });

    it("most active needs 3 matches in the week", () => {
      const few = computeDashboard(
        [m(1, "anna", "luca", 10, 1), m(0, "anna", "luca", 4, 10)],
        starts,
      );
      expect(few.tiles.active).toBeNull();
      const many = computeDashboard(
        [
          m(2, "anna", "luca", 10, 1),
          m(1, "anna", "luca", 4, 10),
          m(0, "anna", "sara", 10, 7),
        ],
        starts,
      );
      expect(many.tiles.active).toEqual({
        player: "anna",
        matches: 3,
        wins: 2,
      });
    });

    it("biggest upset: the underdog side wins against a clearly stronger side", () => {
      const list: MatchLike[] = [];
      // make "star" strong and "rookie" weak
      for (let i = 0; i < 6; i++) list.push(m(25 - i, "star", "rookie", 10, 1));
      list.push(m(1, "rookie", "star", 10, 9)); // upset
      const d = computeDashboard(list, starts);
      expect(d.tiles.upset).not.toBeNull();
      expect(d.tiles.upset!.winners).toEqual(["rookie"]);
      expect(d.tiles.upset!.losers).toEqual(["star"]);
      expect(d.tiles.upset!.gap).toBeGreaterThan(60);
      expect([d.tiles.upset!.winnerScore, d.tiles.upset!.loserScore]).toEqual([
        10, 9,
      ]);
    });

    it("no upset when favourites keep winning or the gap is small", () => {
      const d = computeDashboard(
        [m(5, "anna", "luca", 10, 1), m(4, "luca", "anna", 10, 9)],
        starts,
      );
      expect(d.tiles.upset).toBeNull();
    });

    it("upset works for pairs (average of the side) and ignores draws", () => {
      const list: MatchLike[] = [];
      for (let i = 0; i < 6; i++) list.push(m(25 - i, "a,b", "c,d", 10, 2));
      list.push(m(2, "a,b", "c,d", 5, 5)); // draw: never an upset
      list.push(m(1, "c,d", "a,b", 10, 8));
      const t = computeDashboard(list, starts).tiles.upset!;
      expect(t.winners).toEqual(["c", "d"]);
      expect(t.losers).toEqual(["a", "b"]);
    });
  });
});

describe("topPairs", () => {
  const meta = (
    season: number,
    rating: number,
    matches: number,
    wins: number,
  ) => ({
    season,
    rating,
    totalMatches: matches,
    totalWins: wins,
    totalLosses: matches - wins,
  });
  const teams = [
    {
      name: "a,b",
      teamsize: 2,
      meta: [meta(1, 1040, 6, 5), meta(2, 1000, 1, 0)],
    },
    { name: "c,d", teamsize: 2, meta: [meta(1, 1100, 4, 4)] },
    { name: "e,f", teamsize: 2, meta: [meta(1, 1200, 2, 2)] }, // too few matches
    { name: "a", teamsize: 1, meta: [meta(1, 1300, 9, 9)] }, // not a pair
    { name: "g,h", teamsize: 2, meta: [meta(2, 1050, 3, 2)] }, // other season
  ];
  it("keeps pairs with enough matches in the season, best rating first", () => {
    const rows = topPairs(teams, 1);
    expect(rows.map(r => r.players.join("+"))).toEqual(["c+d", "a+b"]);
    expect(rows[0]).toMatchObject({
      matches: 4,
      wins: 4,
      losses: 0,
      winRate: 1,
    });
    expect(rows[1].winRate).toBeCloseTo(5 / 6);
  });
  it("respects season and limit", () => {
    expect(topPairs(teams, 2).map(r => r.players.join("+"))).toEqual(["g+h"]);
    expect(topPairs(teams, 1, 3, 1)).toHaveLength(1);
  });
});

describe("recentPlayerOrder", () => {
  it("orders by most recent appearance without duplicates", () => {
    expect(
      recentPlayerOrder([
        { team1: "anna,marco", team2: "luca" },
        { team1: "sara", team2: "anna" },
      ]),
    ).toEqual(["anna", "marco", "luca", "sara"]);
  });
});
