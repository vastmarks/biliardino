import { useSession } from "next-auth/react";

/** True while an admin is logged in (see /admin). Used to show destructive actions. */
export function useIsAdmin(): boolean {
  const { status } = useSession();
  return status === "authenticated";
}
