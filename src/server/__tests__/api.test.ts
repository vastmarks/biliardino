/**
 * Integration tests: the real API procedures on a real (temporary) SQLite database with
 * all migrations applied. Admin-only procedures run with a faked admin session.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";

const dir = mkdtempSync(join(tmpdir(), "biliardino-test-"));
const dbFile = join(dir, "test.db");
process.env.DATABASE_URL = `file:${dbFile}`;

let admin = false;
jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(async () =>
    admin ? { user: { name: "admin" } } : null,
  ),
}));

// imported after DATABASE_URL is set
const { appRouter } =
  require("~/server/routers/_app") as typeof import("~/server/routers/_app");
const { prisma } =
  require("~/server/prisma") as typeof import("~/server/prisma");

type Caller = ReturnType<typeof appRouter.createCaller>;
let api: Caller;
const ids: Record<string, number> = {};

beforeAll(async () => {
  const sqlite = new Database(dbFile);
  const migrations = join(__dirname, "../../../prisma/migrations");
  for (const name of readdirSync(migrations).sort()) {
    if (name.endsWith(".toml")) continue;
    sqlite.exec(readFileSync(join(migrations, name, "migration.sql"), "utf8"));
  }
  sqlite.close();

  api = appRouter.createCaller({ req: {} as never, res: {} as never });
  for (const name of ["Anna", "Ben", "Carla", "Dario"]) {
    ids[name] = (await api.players.create({ name })).id;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

const add = (p1: string[], p2: string[], score1: number, score2: number) =>
  api.matches.add({
    format: p1.length === 1 ? "1v1" : "2v2",
    players1: p1.map(n => ids[n]),
    players2: p2.map(n => ids[n]),
    score1,
    score2,
  });

const meta = async (team: string, season = 1) =>
  prisma.teamMeta.findFirstOrThrow({ where: { season, team: { name: team } } });

describe("players", () => {
  it("rejects a name that already exists in another case", async () => {
    await expect(api.players.create({ name: "anna" })).rejects.toThrow(
      "Anna already exists",
    );
  });
});

describe("matches", () => {
  it("stores a 2v2 under one canonical team, whatever the pick order", async () => {
    await add(["Ben", "Anna"], ["Dario", "Carla"], 10, 4);
    await add(["Carla", "Dario"], ["Anna", "Ben"], 10, 8);
    const teams = await prisma.team.findMany({ where: { teamsize: 2 } });
    expect(teams.map(t => t.name).sort()).toEqual(["anna,ben", "carla,dario"]);
    const ab = await meta("anna,ben");
    expect(ab).toMatchObject({ totalMatches: 2, totalWins: 1, totalLosses: 1 });
  });

  it("stores each team's own signed rating change", async () => {
    const m = await add(["Anna"], ["Ben"], 10, 2);
    expect(m.team1RatingChange).toBeGreaterThan(0);
    expect(m.team2RatingChange).toBeLessThan(0);
    expect((await meta("anna")).rating).toBeCloseTo(1000 + m.team1RatingChange);
  });

  it("refuses the same result twice within 5 minutes", async () => {
    await expect(add(["Anna"], ["Ben"], 10, 2)).rejects.toThrow("just saved");
    // also with the sides swapped
    await expect(add(["Ben"], ["Anna"], 2, 10)).rejects.toThrow("just saved");
  });

  it("rejects bad input", async () => {
    await expect(add(["Anna"], ["Anna"], 10, 2)).rejects.toThrow();
    await expect(add(["Anna"], ["Ben"], 100, 2)).rejects.toThrow();
    await expect(
      api.matches.add({
        format: "2v2",
        players1: [ids.Anna, ids.Ben, ids.Carla],
        players2: [ids.Dario],
        score1: 1,
        score2: 0,
      }),
    ).rejects.toThrow();
  });

  it("saves matches sent at the same time without losing a rating update", async () => {
    await Promise.all([
      add(["Carla"], ["Dario"], 10, 1),
      add(["Carla"], ["Anna"], 10, 3),
      add(["Carla"], ["Ben"], 10, 5),
    ]);
    const after = await meta("carla");
    expect(after.totalMatches).toBe(3); // Carla's first 1v1 matches
    const changes = await prisma.match.findMany({ where: { team1: "carla" } });
    const sum = changes.reduce((s, m) => s + m.team1RatingChange, 0);
    expect(after.rating).toBeCloseTo(1000 + sum);
  });

  it("lets anybody delete a fresh match and recalculates the season", async () => {
    const first = await add(["Dario"], ["Ben"], 10, 7);
    await add(["Dario"], ["Ben"], 3, 10);
    await api.matches.delete({ id: first.id });

    // what's left must look exactly as if the deleted match never happened
    const remaining = await prisma.match.findMany({ orderBy: { id: "asc" } });
    const ben = remaining.filter(m => m.team1 === "ben" || m.team2 === "ben");
    const benMeta = await meta("ben");
    expect(benMeta.totalMatches).toBe(ben.length);
    const benSum = ben.reduce(
      (s, m) =>
        s + (m.team1 === "ben" ? m.team1RatingChange : m.team2RatingChange),
      0,
    );
    expect(benMeta.rating).toBeCloseTo(1000 + benSum);
    const last = remaining[remaining.length - 1];
    expect(last.team2).toBe("ben");
    expect(last.team2Rating).toBeCloseTo(benMeta.rating);
  });

  it("saves the note", async () => {
    const m = await api.matches.add({
      format: "1v1",
      players1: [ids.Carla],
      players2: [ids.Dario],
      score1: 10,
      score2: 0,
      comment: "  Final of the Friday cup ",
    });
    expect(m.comment).toBe("  Final of the Friday cup ");
    const listed = await api.matches.list({ team1: "carla", team2: "dario" });
    expect(listed.find(x => x.id === m.id)?.comment).toContain("Friday cup");
  });
});

describe("seasons", () => {
  it("protects the current season and seasons with matches", async () => {
    admin = true;
    try {
      const current = await prisma.season.findFirstOrThrow({
        where: { current: true },
      });
      await expect(api.seasons.delete({ id: current.id })).rejects.toThrow(
        "current season",
      );
      const two = await api.seasons.start();
      expect(two).toMatchObject({ number: 2, current: true });
      // season 1 has matches: only with its number typed again
      await expect(api.seasons.delete({ id: current.id })).rejects.toThrow(
        "Type the season number",
      );
      await expect(
        api.seasons.delete({ id: current.id, confirm: 7 }),
      ).rejects.toThrow("Type the season number");
      // new matches go to the new season
      const m = await add(["Anna"], ["Dario"], 10, 9);
      expect(m.season).toBe(2);
      const hof = await api.hallOfFame.get();
      expect(hof.seasons[0]).toMatchObject({
        season: 2,
        current: true,
        matches: 1,
      });
      expect(hof.seasons.map(s => s.season)).toContain(1);

      // the list knows each season's matches and dates
      const listed = await api.seasons.list();
      const one = listed.find(s => s.number === 1)!;
      expect(listed[0]).toMatchObject({ number: 2, current: true, matches: 1 });
      expect(one.matches).toBeGreaterThan(0);
      expect(one.firstMatchAt!.getTime()).toBeLessThanOrEqual(
        one.lastMatchAt!.getTime(),
      );

      // an empty season goes without confirmation
      const three = await api.seasons.start();
      await api.seasons.activate({ id: two.id });
      await expect(api.seasons.delete({ id: three.id })).resolves.toMatchObject(
        { number: 3, deletedMatches: 0 },
      );

      // season 1 with its matches, ratings and achievements
      const before = one.matches;
      await expect(
        api.seasons.delete({ id: one.id, confirm: 1 }),
      ).resolves.toMatchObject({ number: 1, deletedMatches: before });
      expect(await prisma.match.count({ where: { season: 1 } })).toBe(0);
      expect(await prisma.teamMeta.count({ where: { season: 1 } })).toBe(0);
      expect(await prisma.teamAchievement.count({ where: { season: 1 } })).toBe(
        0,
      );
      expect(await prisma.match.count({ where: { season: 2 } })).toBe(1);
      expect((await api.seasons.list()).map(s => s.number)).toEqual([2]);
    } finally {
      admin = false;
    }
  });
});

describe("dashboard", () => {
  it("returns the home page data for the current season", async () => {
    const d = await api.dashboard.get({});
    expect(d.season).toBe(2);
    expect(d.recent).toHaveLength(1);
    expect(
      d.roster
        .map(p => p.name)
        .slice(0, 2)
        .sort(),
    ).toEqual(["Anna", "Dario"]);
  });
});

describe("matches page filters", () => {
  it("filters by player, format and season", async () => {
    for (const name of ["Pia", "Quin", "Rita", "Sam"]) {
      ids[name] = (await api.players.create({ name })).id;
    }
    await add(["Pia"], ["Quin"], 10, 5);
    await add(["Pia", "Rita"], ["Quin", "Sam"], 10, 7);
    await add(["Rita"], ["Sam"], 10, 9);
    const list = async (
      input: Parameters<typeof api.matches.infiniteList>[0],
    ) =>
      (await api.matches.infiniteList(input)).items.map(
        m => `${m.team1}-${m.team2}`,
      );

    expect(await list({ player: "pia" })).toEqual([
      "pia,rita-quin,sam",
      "pia-quin",
    ]);
    expect(await list({ player: "sam" })).toEqual([
      "rita-sam",
      "pia,rita-quin,sam",
    ]);
    expect(await list({ player: "pia", format: "1v1" })).toEqual(["pia-quin"]);
    expect(await list({ player: "rita", format: "2v2" })).toEqual([
      "pia,rita-quin,sam",
    ]);
    // a key that is only part of another player's key doesn't match
    expect(await list({ player: "ri" })).toEqual([]);
    // other seasons: none of these were played in season 1
    expect(await list({ player: "pia", season: 1 })).toEqual([]);
    expect(await list({ player: "pia", season: "all" })).toHaveLength(2);
  });
});

describe("corrections", () => {
  const oldMatch = async (
    team1: string,
    team2: string,
    s1: number,
    s2: number,
  ) => {
    const { writeTransaction } = await import("~/server/db");
    const { createMatch } = await import("~/server/model/match");
    const month = new Date(Date.now() - 30 * 24 * 3600_000);
    return writeTransaction(db =>
      createMatch(db, { team1, team2, score1: s1, score2: s2, date: month }),
    );
  };

  it("edits players and score, and the season is recalculated", async () => {
    const m = await add(["Ben"], ["Carla"], 10, 1);
    const fixed = await api.matches.update({
      id: m.id,
      players1: [ids.Ben],
      players2: [ids.Dario], // wrong opponent was picked
      score1: 5,
      score2: 10,
      comment: "fixed",
    });
    expect(fixed).toMatchObject({
      team2: "dario",
      score1: 5,
      score2: 10,
      comment: "fixed",
    });
    // the result is now a win for dario: his rating change must be positive
    expect(fixed.team2RatingChange).toBeGreaterThan(0);
    const stored = await prisma.match.findUniqueOrThrow({
      where: { id: m.id },
    });
    expect(stored.team1RatingChange).toBeCloseTo(fixed.team1RatingChange);
    // every team's rating still equals 1000 + the sum of its match changes
    for (const t of await prisma.team.findMany({ where: { teamsize: 1 } })) {
      const rows = await prisma.match.findMany({
        where: {
          season: stored.season,
          OR: [{ team1: t.name }, { team2: t.name }],
        },
      });
      const sum = rows.reduce(
        (a, r) =>
          a + (r.team1 === t.name ? r.team1RatingChange : r.team2RatingChange),
        0,
      );
      const tm = await prisma.teamMeta.findFirst({
        where: { teamId: t.id, season: stored.season },
      });
      if (tm) expect(tm.rating).toBeCloseTo(1000 + sum);
    }
  });

  it("keeps a 1v1 a 1v1", async () => {
    const m = await add(["Anna"], ["Carla"], 10, 6);
    await expect(
      api.matches.update({
        id: m.id,
        players1: [ids.Anna, ids.Ben],
        players2: [ids.Carla, ids.Dario],
        score1: 10,
        score2: 6,
      }),
    ).rejects.toThrow("1v1");
  });

  it("locks matches older than 24 hours for everybody but the admin", async () => {
    const old = await oldMatch("anna", "dario", 10, 2);
    await expect(api.matches.delete({ id: old.id })).rejects.toThrow(
      "older than 24 hours",
    );
    await expect(
      api.matches.update({
        id: old.id,
        players1: [ids.Anna],
        players2: [ids.Dario],
        score1: 10,
        score2: 3,
      }),
    ).rejects.toThrow("older than 24 hours");
    admin = true;
    try {
      const done = await api.matches.update({
        id: old.id,
        players1: [ids.Anna],
        players2: [ids.Dario],
        score1: 10,
        score2: 3,
      });
      expect(done.score2).toBe(3);
      await api.matches.delete({ id: old.id });
    } finally {
      admin = false;
    }
  });
});

describe("player management", () => {
  it("renames a player everywhere, including pair names", async () => {
    const zed = await api.players.create({ name: "Zed" });
    ids.Zed = zed.id;
    await add(["Zed", "Anna"], ["Ben", "Carla"], 10, 3);
    expect(
      (await prisma.team.findMany({ where: { name: "anna,zed" } })).length,
    ).toBe(1);

    await api.players.rename({ id: zed.id, name: "Aaron" });
    // "aaron,anna" sorts differently from "anna,zed": names are rebuilt, not just replaced
    expect(
      await prisma.team.findUnique({ where: { name: "anna,zed" } }),
    ).toBeNull();
    expect(
      await prisma.team.findUnique({ where: { name: "aaron,anna" } }),
    ).not.toBeNull();
    const m = await prisma.match.findFirstOrThrow({
      where: { team1: "aaron,anna" },
    });
    expect(m.team1).toBe("aaron,anna");
    expect((await api.players.all()).find(p => p.id === zed.id)).toMatchObject({
      name: "Aaron",
      key: "aaron",
      matches: 1,
    });
    // the same name in another case is still the same player (just a recapitalisation)
    await api.players.rename({ id: zed.id, name: "AARON" });
    await expect(
      api.players.rename({ id: zed.id, name: "ben" }),
    ).rejects.toThrow("Ben already exists");
  });

  it("archives and restores a player without touching history", async () => {
    await api.players.archive({ id: ids.Aaron ?? ids.Zed, archived: true });
    const d = await api.dashboard.get({});
    const row = d.roster.find(p => p.id === ids.Zed)!;
    expect(row.archived).toBe(true); // still in the roster so names resolve
    expect(d.boards.season.some(r => r.name === "aaron")).toBe(false);
    expect(await prisma.match.count({ where: { team1: "aaron,anna" } })).toBe(
      1,
    );
    await api.players.archive({ id: ids.Zed, archived: false });
  });

  it("lets anybody delete a player who never played, nobody else without being admin", async () => {
    const ghost = await api.players.create({ name: "Ghost" });
    await api.players.delete({ id: ghost.id, confirmName: "" });
    expect(
      await prisma.player.findUnique({ where: { id: ghost.id } }),
    ).toBeNull();

    await expect(
      api.players.delete({ id: ids.Zed, confirmName: "Aaron" }),
    ).rejects.toThrow("Only the admin");
  });

  it("deletes a player with their matches only with the right name, and fixes the others' ratings", async () => {
    admin = true;
    try {
      await expect(
        api.players.delete({ id: ids.Zed, confirmName: "nope" }),
      ).rejects.toThrow("doesn't match");
      const result = await api.players.delete({
        id: ids.Zed,
        confirmName: "aaron",
      });
      expect(result.deletedMatches).toBeGreaterThan(0);
    } finally {
      admin = false;
    }
    expect(
      await prisma.player.findUnique({ where: { id: ids.Zed } }),
    ).toBeNull();
    expect(
      await prisma.team.findUnique({ where: { name: "aaron,anna" } }),
    ).toBeNull();
    // the other teams' stats were rebuilt without those matches
    for (const t of await prisma.team.findMany()) {
      const total = await prisma.match.count({
        where: { OR: [{ team1: t.name }, { team2: t.name }] },
      });
      const metaTotal = (
        await prisma.teamMeta.findMany({ where: { teamId: t.id } })
      ).reduce((a, m) => a + m.totalMatches, 0);
      expect(metaTotal).toBe(total);
    }
  });
});
