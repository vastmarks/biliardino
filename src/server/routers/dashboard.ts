import { z } from "zod";
import { publicProcedure, router } from "~/server/trpc";
import { loadDashboard } from "~/server/model/dashboard";

export const dashboardRouter = router({
  get: publicProcedure
    .input(z.object({ season: z.number().int().optional() }).optional())
    .query(({ input }) => loadDashboard(input?.season)),
});
