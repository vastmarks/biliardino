import { ReactNode } from "react";
import {
  LoadingIndicator,
  PageTitle,
  PlayerLink,
  PlayerNames,
} from "~/components/Elements";
import { trpc } from "~/utils/trpc";
import type { HallRecord, RecordKey, SeasonChampion } from "~/utils/hallOfFame";
import { PROVISIONAL_MATCHES } from "~/utils/playerStats";

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** How each record is introduced and what the small line under the name says. */
const RECORDS: Record<
  RecordKey,
  { icon: string; label: string; line: (r: HallRecord) => ReactNode }
> = {
  peakRating: {
    icon: "🏔️",
    label: "Highest rating",
    line: r => (
      <>
        <b className="text-gray-700 dark:text-gray-200">
          {Math.round(r.value)}
        </b>{" "}
        reached in season {r.season}
      </>
    ),
  },
  winStreak: {
    icon: "🔥",
    label: "Longest win streak",
    line: r => `${r.value} wins in a row`,
  },
  mostWins: {
    icon: "🏆",
    label: "Most wins",
    line: r =>
      `${r.value} wins in ${plural(r.detail?.matches ?? 0, "match", "matches")}`,
  },
  biggestWin: {
    icon: "💥",
    label: "Biggest win",
    line: r => (
      <>
        {r.detail?.score}:{r.detail?.other} against{" "}
        <PlayerNames team={r.opponents ?? []} />
      </>
    ),
  },
  biggestUpset: {
    icon: "😱",
    label: "Biggest upset",
    line: r => (
      <>
        {r.detail?.score}:{r.detail?.other} against{" "}
        <PlayerNames team={r.opponents ?? []} />, rated {r.value} higher
      </>
    ),
  },
  marathon: {
    icon: "⏱️",
    label: "Marathon day",
    line: r => `${r.value} matches in one day`,
  },
};

const RecordCard = ({ record }: { record: HallRecord }) => {
  const meta = RECORDS[record.key];
  return (
    <li className="rounded-lg bg-white dark:bg-gray-800 shadow-sm p-3 sm:p-4 min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">
        <span aria-hidden>{meta.icon}</span> {meta.label}
      </div>
      <div className="mt-1 text-lg font-bold truncate">
        <PlayerNames team={record.players} />
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {meta.line(record)}
      </div>
      <div className="mt-1 text-xs text-gray-400">
        {/* "most wins" is a running total, not a moment */}
        {record.key === "mostWins" ? "all time" : date(record.date)}
      </div>
    </li>
  );
};

const SeasonRow = ({ s }: { s: SeasonChampion }) => (
  <li className="flex gap-4 px-4 py-3">
    <div className="w-20 shrink-0">
      <div className="font-semibold">Season {s.season}</div>
      <div className="text-xs text-gray-400">
        {s.current ? "in progress" : plural(s.matches, "match", "matches")}
      </div>
    </div>
    <div className="flex-1 min-w-0 space-y-0.5">
      {s.champion ? (
        <div>
          <span aria-hidden>{s.current ? "📈" : "👑"}</span>{" "}
          <b>
            <PlayerLink name={s.champion.player} />
          </b>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {" "}
            {s.current ? "leading" : "champion"}
          </span>
          <div className="text-xs text-gray-400">
            {Math.round(s.champion.rating)} rating · {s.champion.wins} won,{" "}
            {s.champion.losses} lost
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          No champion yet: {PROVISIONAL_MATCHES} matches needed
        </div>
      )}
      {s.pair && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span aria-hidden>🤝</span> Best pair{" "}
          <PlayerNames team={s.pair.players} />
          <span className="text-xs text-gray-400">
            {" "}
            · {Math.round(s.pair.rating)}
          </span>
        </div>
      )}
    </div>
  </li>
);

/**
 * Hall of Fame: what the home page doesn't show. The home page is about now (this season,
 * this week); this page is about all time: records and who won each season.
 */
const HallOfFame = () => {
  const { data, isLoading } = trpc.hallOfFame.get.useQuery();

  return (
    <>
      <PageTitle title="Hall of Fame" />
      <div className="my-4">
        <h1 className="text-2xl font-bold">Hall of Fame</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All-time records and the champion of every season
          {data &&
            data.totalMatches > 0 &&
            ` · ${plural(data.totalMatches, "match", "matches")} played`}
        </p>
      </div>

      {isLoading && <LoadingIndicator />}

      {data && data.totalMatches === 0 && (
        <p className="rounded-lg bg-white dark:bg-gray-800 shadow-sm p-6 text-center text-sm text-gray-500">
          No records yet. Play a few matches and they will show up here.
        </p>
      )}

      {data && data.records.length > 0 && (
        <section aria-labelledby="records">
          <h2 id="records" className="sr-only">
            Records
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.records.map(r => (
              <RecordCard key={r.key} record={r} />
            ))}
          </ul>
        </section>
      )}

      {data && data.seasons.length > 0 && (
        <section aria-labelledby="champions" className="mt-8">
          <h2 id="champions" className="font-bold mb-2 px-1">
            Champions
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            {data.seasons.map(s => (
              <SeasonRow key={s.season} s={s} />
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2 px-1">
            The champion is the best-rated player at the end of the season (from{" "}
            {PROVISIONAL_MATCHES} matches on); the best pair is the best-rated
            2v2 team with at least 3 matches.
          </p>
        </section>
      )}
    </>
  );
};

export default HallOfFame;
