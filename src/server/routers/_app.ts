import { router } from "../trpc";
import { matchesRouter } from "~/server/routers/matches";
import { teamsRouter } from "~/server/routers/teams";
import { hallOfFameRouter } from "~/server/routers/hallOfFame";
import { seasonsRouter } from "~/server/routers/seasons";
import { playersRouter } from "~/server/routers/players";
import { sessionRouter } from "~/server/routers/session";
import { dashboardRouter } from "~/server/routers/dashboard";

export const appRouter = router({
  matches: matchesRouter,
  teams: teamsRouter,
  hallOfFame: hallOfFameRouter,
  seasons: seasonsRouter,
  players: playersRouter,
  session: sessionRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
