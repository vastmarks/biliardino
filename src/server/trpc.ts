/**
 * tRPC setup: every API call of the app goes through a procedure defined with these helpers.
 * @see https://trpc.io/docs/server/routers
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getServerSession } from "next-auth";
import { Context } from "./context";
import { authOptions } from "~/pages/api/auth/[...nextauth]";

const t = initTRPC.context<Context>().create({
  // Dates etc. survive the trip to the browser
  transformer: superjson,
});

export const router = t.router;

/** Open to everybody (reading data, adding players and matches). */
export const publicProcedure = t.procedure;

/**
 * Open to everybody, but the procedure learns whether the caller is the admin
 * (`ctx.isAdmin`), for actions with different rules for admin and everybody else.
 */
export const roleAwareProcedure = t.procedure.use(async ({ next, ctx }) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  return next({ ctx: { ...ctx, isAdmin: session !== null } });
});

/** Only for the logged-in admin (deleting things, managing seasons). */
export const protectedProcedure = t.procedure.use(async ({ next, ctx }) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});
