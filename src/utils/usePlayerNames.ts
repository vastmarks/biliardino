import { useMemo } from "react";
import { trpc } from "~/utils/trpc";
import { parsePlayers } from "~/utils/playerStats";

/** Maps a player key ("elena") to its display name ("Elena"); falls back to the key. */
export function usePlayerNames() {
  const { data } = trpc.players.all.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  return useMemo(() => {
    const names = new Map((data ?? []).map(p => [p.key, p.name]));
    const display = (key: string) => names.get(key) ?? key;
    return {
      display,
      /** "chiara,elena" -> "Chiara & Elena" */
      team: (teamName: string) =>
        parsePlayers(teamName).map(display).join(" & "),
    };
  }, [data]);
}
