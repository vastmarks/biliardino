import { trpc } from "~/utils/trpc";

/** True while an admin is logged in (see /admin). Used to show destructive actions. */
export function useIsAdmin(): boolean {
  const { data } = trpc.session.isAdmin.useQuery(undefined, {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  return data === true;
}
