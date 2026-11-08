import { PlayerLink } from "~/components/Elements/PlayerLink";
import Link from "next/link";
import type { PairRow } from "~/utils/dashboard";
import { teamNameFromKeys } from "~/utils/players";

export const Pairs = ({ pairs }: { pairs: PairRow[] }) => {
  if (pairs.length === 0) return null;
  return (
    <section className="rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <h2 className="font-bold px-3 pt-3 sm:px-4">Top pairs</h2>
      <ol className="mt-1 pb-1">
        {pairs.map((p, i) => (
          <li
            key={p.players.join()}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm"
          >
            <span className="w-5 text-right tabular-nums text-gray-400">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0 truncate font-semibold">
              {p.players.map((n, j) => (
                <span key={n}>
                  {j > 0 && " & "}
                  <PlayerLink name={n} />
                </span>
              ))}
            </span>
            <span className="text-xs text-gray-500 tabular-nums">
              {p.wins}-{p.losses} · {Math.round(p.winRate * 100)}%
            </span>
            <b className="w-12 text-right tabular-nums">
              {Math.round(p.rating)}
            </b>
          </li>
        ))}
      </ol>
    </section>
  );
};
