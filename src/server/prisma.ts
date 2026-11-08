/**
 * Instantiates a single PrismaClient (SQLite via the better-sqlite3 driver adapter)
 * and keeps it on the global object during development.
 * @link https://www.prisma.io/docs/orm/overview/databases/sqlite
 */
import { mkdirSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";

const prismaGlobal = global as typeof global & {
  prisma?: PrismaClient;
};

/**
 * Relative sqlite paths are resolved against the `prisma/` folder by the Prisma CLI
 * (`prisma migrate`), so the app does the same to always open the file the migrations
 * were applied to. Missing parent directories are created.
 */
export function resolveDatabaseUrl(url: string): string {
  const path = url.replace(/^file:/, "");
  if (path === ":memory:") {
    return url;
  }
  const absolute = isAbsolute(path)
    ? path
    : resolve(process.cwd(), "prisma", path);
  mkdirSync(dirname(absolute), { recursive: true });
  return `file:${absolute}`;
}

function createClient() {
  const adapter = new PrismaBetterSQLite3({
    url: resolveDatabaseUrl(
      process.env.DATABASE_URL ?? "file:../data/biliardino.db",
    ),
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient = prismaGlobal.prisma || createClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
}
