import { createTRPCNext } from "@trpc/next";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "~/server/routers/_app";

/**
 * Typed API client for the browser. Pages that need data before the first paint load it
 * in getServerSideProps instead (see pages/index.tsx), so there's no server-side fetching.
 */
export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
    };
  },
  ssr: false,
  transformer: superjson,
});
