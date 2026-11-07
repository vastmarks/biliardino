/**
 * Database writes that read before they write (rating updates!) must not interleave,
 * otherwise two phones saving a match at the same moment could overwrite each other's
 * ratings. Every such write goes through `writeTransaction`:
 *
 * - the transaction makes it all-or-nothing,
 * - the queue runs one after the other. Prisma's SQLite adapter already serializes
 *   transactions on its single connection; the queue makes that guarantee explicit, so it
 *   doesn't depend on adapter internals (src/server/__tests__/api.test.ts checks it).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "~/server/prisma";

/** The client inside a transaction (same API as `prisma`). */
export type Db = Prisma.TransactionClient;

let queue: Promise<unknown> = Promise.resolve();

export function writeTransaction<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const run = queue.then(() =>
    prisma.$transaction(work, { maxWait: 10_000, timeout: 30_000 }),
  );
  // keep the queue going even if this transaction fails
  queue = run.catch(() => undefined);
  return run;
}
