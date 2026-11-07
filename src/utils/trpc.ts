import { createTRPCNext } from "@trpc/next";
import type { AppRouter } from "~/server/routers/_app";
import superjson from "superjson";
import { httpBatchLink } from "@trpc/client";

export const trpc = createTRPCNext<AppRouter>({
  config() {
    const url =
      typeof window !== "undefined"
        ? `/api/trpc`
        : `${process.env.NEXTAUTH_URL}/api/trpc`;

    return {
      links: [
        httpBatchLink({
          url,
          transformer: superjson,
        }),
      ],
    };
  },
  ssr: false,
  transformer: superjson,
});
