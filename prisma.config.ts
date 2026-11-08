/**
 * Prisma 7 settings (they used to live in schema.prisma and package.json).
 * https://www.prisma.io/docs/orm/reference/prisma-config-reference
 *
 * Deliberately imports nothing at runtime: in the Docker image the Prisma CLI that applies
 * the migrations is installed globally, so `prisma/config` can't be imported from here.
 */
import type { PrismaConfig } from "prisma";
import path from "node:path";

// Prisma 7 no longer reads .env by itself; Node can (the file is optional, Docker passes env vars)
try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}

/** Relative SQLite paths count from the prisma/ folder, as in Prisma 6 and in src/server/prisma.ts. */
function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:../data/biliardino.db";
  const file = url.replace(/^file:/, "");
  if (file === ":memory:" || path.isAbsolute(file)) return url;
  return `file:${path.resolve(__dirname, "prisma", file)}`;
}

export default {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: databaseUrl() },
} satisfies PrismaConfig;
