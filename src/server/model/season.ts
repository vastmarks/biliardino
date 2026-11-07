import { prisma } from "~/server/prisma";
import type { Db } from "~/server/db";

/** Number of the season marked as current (falls back to 1 on an empty database). */
export async function getCurrentSeason(db: Db = prisma): Promise<number> {
  const season = await db.season.findFirst({ where: { current: true } });
  return season?.number ?? 1;
}
