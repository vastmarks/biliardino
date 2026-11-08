import { useState } from "react";
import { PlayerLink } from "~/components/Elements/PlayerLink";
import type { BoardRow, PeriodKey } from "~/utils/dashboard";
import { FORM_LENGTH, PERIODS } from "~/utils/dashboard";

const LABELS: Record<PeriodKey, string> = {
  today: "Today",
  week: "7 days",
  month: "30 days",
  season: "Season",
};

const formStyle = {
  W: "bg-green-600 text-white",
  L: "bg-red-600 text-white",
  D: "bg-gray-400 text-white",
} as const;

const Form = ({ form }: { form: BoardRow["form"] }) => (
  <span
    className="inline-flex gap-0.5"
    aria-label={`Last results: ${form.join(" ")}`}
  >
    {Array.from({ length: FORM_LENGTH }, (_, i) => {
      const r = form[form.length - FORM_LENGTH + i];
      return (
        <span
          key={i}
          aria-hidden
          className={`w-4 h-4 rounded-xs text-[10px] leading-4 text-center font-bold ${
            r ? formStyle[r] : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          {r ?? ""}
        </span>
      );
    })}
  </span>
);

const Movement = ({ row }: { row: BoardRow }) => {
  if (row.isNew)
    return (
      <span className="text-[10px] font-bold text-blue-500 dark:text-blue-300">
        NEW
      </span>
    );
  if (!row.rankChange) return <span className="text-gray-300">–</span>;
  const up = row.rankChange > 0;
  return (
    <span
      className={`text-xs ${up ? "text-green-500" : "text-red-500"}`}
      title={`${up ? "Up" : "Down"} ${Math.abs(row.rankChange)} since last week`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(row.rankChange)}
    </span>
  );
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}`;

export const Leaderboard = ({
  boards,
}: {
  boards: Record<PeriodKey, BoardRow[]>;
}) => {
  const [period, setPeriod] = useState<PeriodKey>("season");
  const rows = boards[period];
  const isSeason = period === "season";
  const firstPlacement = isSeason ? rows.findIndex(r => r.placement) : -1;
  // rank shown in front of each row: placement players (season view) get none
  const ranks = rows.reduce<number[]>(
    (acc, r) => [
      ...acc,
      !isSeason || !r.placement ? Math.max(0, ...acc) + 1 : 0,
    ],
    [],
  );

  return (
    <section className="rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 sm:px-4">
        <h2 className="font-bold">Leaderboard</h2>
        <div
          className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5"
          role="tablist"
        >
          {PERIODS.map(p => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 h-8 rounded-md text-xs font-semibold ${
                period === p ? "bg-blue-500 text-white" : "text-gray-500"
              }`}
            >
              {LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">
          {isSeason ? "No matches yet." : "Nobody has played in this period."}
        </p>
      ) : (
        <ol className="mt-2 pb-1">
          {rows.map((r, i) => {
            const rank = ranks[i];
            const ranked = rank > 0;
            return (
              <li key={r.name}>
                {i === firstPlacement && (
                  <div className="px-3 sm:px-4 py-1 text-[11px] uppercase tracking-wide text-gray-400 border-t dark:border-gray-700">
                    Placement - needs 5 matches
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm">
                  <span className="w-5 text-right tabular-nums text-gray-400">
                    {ranked ? rank : ""}
                  </span>
                  {isSeason && (
                    <span className="w-8 text-center">
                      <Movement row={r} />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 truncate font-semibold">
                    <PlayerLink name={r.name} />
                  </span>
                  <Form form={r.form} />
                  <span className="w-14 text-right tabular-nums">
                    {isSeason ? (
                      <>
                        <b>{Math.round(r.rating)}</b>
                        {r.placement && (
                          <span className="text-gray-400">?</span>
                        )}
                      </>
                    ) : (
                      <b
                        className={
                          r.delta > 0
                            ? "text-green-500"
                            : r.delta < 0
                              ? "text-red-500"
                              : ""
                        }
                      >
                        {signed(r.delta)}
                      </b>
                    )}
                    <span className="block text-[10px] leading-none text-gray-400">
                      {r.wins}-{r.losses}
                      {r.draws ? `-${r.draws}` : ""}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
