import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/prisma";

/** Liveness check for Docker: the app is up and the database answers. */
export default async function health(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "database unavailable" });
  }
}
