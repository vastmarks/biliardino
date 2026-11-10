/**
 * Fills an EMPTY database with demo players and ~45 days of matches, so the dashboard
 * has something to show: `npm run db:seed-demo`.
 * Refuses to touch a database that already has players or matches.
 */
import { prisma } from "~/server/prisma";
import { createMatch } from "~/server/model/match";
import { writeTransaction } from "~/server/db";
import { getCurrentSeason } from "~/server/model/season";
import { playerKey, teamNameFromKeys } from "~/utils/players";

// hidden "true skill" of each demo player, only used to make the results plausible
const SKILL: Record<string, number> = {
  Carlo: 1.2,
  Chiara: 1.0,
  Luca: 0.6,
  Sara: 0.9,
  Marco: 1.4,
  Giulia: 0.7,
  Paolo: 0.5,
  Elena: 1.1,
};

// small deterministic RNG so the demo data is the same on every run
let seed = 20261105;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];

async function main() {
  if ((await prisma.player.count()) > 0 || (await prisma.match.count()) > 0) {
    console.error("Database is not empty, refusing to add demo data.");
    process.exit(1);
  }
  const names = Object.keys(SKILL);
  for (const name of names) {
    await prisma.player.create({ data: { name, key: playerKey(name) } });
  }
  const season = await getCurrentSeason();

  const now = new Date();
  const matches: Array<{ date: Date; a: string[]; b: string[] }> = [];
  for (let daysAgo = 45; daysAgo >= 0; daysAgo--) {
    const day = new Date(now);
    day.setDate(day.getDate() - daysAgo);
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const count = daysAgo === 0 ? 3 : Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const date = new Date(day);
      date.setHours(i % 2 === 0 ? 12 : 17, 10 + i * 20, 0, 0);
      if (date > now) date.setTime(now.getTime() - (count - i) * 25 * 60_000);
      const pool = [...names].sort(() => rand() - 0.5);
      const size = rand() < 0.4 ? 1 : 2;
      matches.push({
        date,
        a: pool.slice(0, size),
        b: pool.slice(size, size * 2),
      });
    }
  }
  matches.sort((x, y) => x.date.getTime() - y.date.getTime());

  for (const m of matches) {
    const strength = (side: string[]) =>
      side.reduce((s, n) => s + SKILL[n], 0) / side.length;
    const pA = 1 / (1 + Math.exp(-(strength(m.a) - strength(m.b)) * 2.2));
    const aWins = rand() < pA;
    const loser = Math.min(9, Math.floor(rand() * 10));
    const [score1, score2] = aWins ? [10, loser] : [loser, 10];
    await writeTransaction(db =>
      createMatch(db, {
        team1: teamNameFromKeys(m.a.map(playerKey)),
        team2: teamNameFromKeys(m.b.map(playerKey)),
        score1,
        score2,
        date: m.date,
        season,
      }),
    );
  }
  console.log(`Added ${names.length} players and ${matches.length} matches.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
