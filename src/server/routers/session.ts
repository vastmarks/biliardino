import { getServerSession } from "next-auth";
import { publicProcedure, router } from "~/server/trpc";
import { authOptions } from "~/pages/api/auth/[...nextauth]";

export const sessionRouter = router({
  /** Whether the caller is logged in as admin (replaces the client-side next-auth session). */
  isAdmin: publicProcedure.query(async ({ ctx }) => {
    const session = await getServerSession(ctx.req, ctx.res, authOptions);
    return !!session;
  }),
});
