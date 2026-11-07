import {
  applyResult,
  emptyTeamNumbers,
  fromMeta,
  replaySeason,
  toMetaData,
} from "~/utils/teamStats";

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour);

describe("applyResult", () => {
  it("winner gains what the loser loses when both start equal", () => {
    const a = applyResult(emptyTeamNumbers(), 1000, 10, 4, at(1));
    const b = applyResult(emptyTeamNumbers(), 1000, 4, 10, at(1));
    expect(a.ratingChange).toBeCloseTo(16);
    expect(b.ratingChange).toBeCloseTo(-16);
    expect(a.after).toMatchObject({
      totalMatches: 1,
      totalWins: 1,
      totalLosses: 0,
      totalWinRate: 1,
      totalScore: 10,
      currentWinStreak: 1,
      totalHighestWinStreak: 1,
      dailyMatches: 1,
    });
    expect(b.after).toMatchObject({ totalLosses: 1, currentLosingStreak: 1 });
    expect(b.after.totalLowestRating).toBeCloseTo(984);
  });

  it("treats a draw as half a win and ends streaks", () => {
    const won = applyResult(emptyTeamNumbers(), 1000, 10, 2, at(1)).after;
    const draw = applyResult(won, 1000, 5, 5, at(1));
    expect(draw.ratingChange).toBeLessThan(0); // favourite drew
    expect(draw.after.totalWins).toBe(1);
    expect(draw.after.totalLosses).toBe(0);
    expect(draw.after.currentWinStreak).toBe(0);
    expect(draw.after.totalHighestWinStreak).toBe(1);
  });

  it("resets the daily numbers on a new day", () => {
    let t = applyResult(emptyTeamNumbers(), 1000, 10, 2, at(1, 9)).after;
    t = applyResult(t, 1000, 10, 2, at(1, 17)).after;
    expect(t.dailyMatches).toBe(2);
    t = applyResult(t, 1000, 3, 10, at(2, 9)).after;
    expect(t).toMatchObject({ dailyMatches: 1, dailyWins: 0, dailyLosses: 1 });
    expect(t.totalMatches).toBe(3);
  });
});

describe("replaySeason", () => {
  const matches = [
    { id: 2, createdAt: at(2), team1: "b", team2: "a", score1: 10, score2: 8 },
    { id: 1, createdAt: at(1), team1: "a", team2: "b", score1: 10, score2: 3 },
    { id: 3, createdAt: at(2), team1: "a", team2: "c", score1: 10, score2: 9 },
  ];

  it("replays in date order (then id) and records each match's ratings", () => {
    const r = replaySeason(matches);
    const m1 = r.matches.get(1)!;
    expect(m1.team1RatingChange).toBeCloseTo(16);
    expect(m1.team2RatingChange).toBeCloseTo(-16);
    expect(m1.team1Rating).toBeCloseTo(1016);
    const a = r.teams.get("a")!;
    expect(a.totalMatches).toBe(3);
    expect(a.totalWins).toBe(2);
    // a's final rating = sum of its changes
    const changes =
      r.matches.get(1)!.team1RatingChange +
      r.matches.get(2)!.team2RatingChange +
      r.matches.get(3)!.team1RatingChange;
    expect(a.rating).toBeCloseTo(1000 + changes);
  });

  it("is the same as applying the matches one by one", () => {
    let a = emptyTeamNumbers();
    let b = emptyTeamNumbers();
    const r1 = applyResult(a, b.rating, 10, 3, at(1));
    const r2 = applyResult(b, a.rating, 3, 10, at(1));
    a = r1.after;
    b = r2.after;
    const replay = replaySeason([matches[1]]);
    expect(replay.teams.get("a")).toEqual(a);
    expect(replay.teams.get("b")).toEqual(b);
  });

  it("returns nothing for an empty season", () => {
    const r = replaySeason([]);
    expect(r.teams.size).toBe(0);
    expect(r.matches.size).toBe(0);
  });
});

describe("meta conversion", () => {
  it("round-trips through the database shape", () => {
    const t = applyResult(emptyTeamNumbers(), 1000, 10, 2, at(3)).after;
    const stored = toMetaData(t);
    expect(stored.updatedAt).toEqual(at(3));
    expect(fromMeta(stored, true)).toEqual(t);
    expect(fromMeta(toMetaData(emptyTeamNumbers()), false)).toEqual(
      emptyTeamNumbers(),
    );
  });
});
