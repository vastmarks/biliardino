/**
 * Integration tests: the real API procedures on a real (temporary) SQLite database with
 * all migrations applied. Admin-only procedures run with a faked admin session.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";

const dir = mkdtempSync(join(tmpdir(), "hilde-test-"));
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

  it("only lets the admin delete, and recalculates the season", async () => {
    const first = await add(["Dario"], ["Ben"], 10, 7);
    await add(["Dario"], ["Ben"], 3, 10);
    await expect(api.matches.delete({ id: first.id })).rejects.toThrow(
      "UNAUTHORIZED",
    );

    admin = true;
    try {
      await api.matches.delete({ id: first.id });
    } finally {
      admin = false;
    }

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
      const two = await api.seasons.add({ number: 2 });
      await expect(api.seasons.add({ number: 2 })).rejects.toThrow(
        "already exists",
      );
      await api.seasons.activate({ id: two.id });
      await expect(api.seasons.delete({ id: current.id })).rejects.toThrow(
        "has",
      );
      // new matches go to the new season
      const m = await add(["Anna"], ["Dario"], 10, 9);
      expect(m.season).toBe(2);
      const leaderboards = await api.leaderboards.forSeason({ season: 2 });
      expect(leaderboards.totalMatches).toMatchObject({ total: 1, perDay: 1 });
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
