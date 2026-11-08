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
import { PAIR_MIN_MATCHES } from "~/utils/dashboard";

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

const month = (d: Date, year = true) =>
  new Date(d).toLocaleDateString("en-GB", {
    month: "short",
    ...(year ? { year: "numeric" } : {}),
  });

/** When a season was played: "Oct 2026", "Sept – Oct 2026", "Dec 2026 – Jan 2027" */
function months(s: SeasonChampion): string {
  if (s.current) return `since ${month(s.from)}`;
  const from = new Date(s.from);
  const to = new Date(s.to);
  if (month(from) === month(to)) return month(to);
  return from.getFullYear() === to.getFullYear()
    ? `${month(from, false)} – ${month(to)}`
    : `${month(from)} – ${month(to)}`;
}

const ChampionLine = ({
  icon,
  label,
  who,
  rating,
}: {
  icon: string;
  label: string;
  who: ReactNode;
  rating: number;
}) => (
  <div className="text-sm">
    <span aria-hidden>{icon}</span>{" "}
    <span className="text-gray-500 dark:text-gray-400">{label}</span>{" "}
    <b>{who}</b>
    <span className="text-xs text-gray-400"> · {Math.round(rating)}</span>
  </div>
);

const SeasonRow = ({ s }: { s: SeasonChampion }) => (
  <li className="flex gap-4 px-4 py-3">
    <div className="w-28 shrink-0">
      <div className="font-semibold">Season {s.season}</div>
      <div className="text-xs text-gray-400">{months(s)}</div>
      <div className="text-xs text-gray-400">
        {s.current ? "in progress" : plural(s.matches, "match", "matches")}
      </div>
    </div>
    <div className="flex-1 min-w-0 space-y-0.5">
      {s.single && (
        <ChampionLine
          icon={s.current ? "📈" : "👑"}
          label={s.current ? "1v1 leader" : "1v1"}
          who={<PlayerLink name={s.single.player} />}
          rating={s.single.rating}
        />
      )}
      {s.pair && (
        <ChampionLine
          icon={s.current ? "📈" : "👑"}
          label={s.current ? "2v2 leaders" : "2v2"}
          who={<PlayerNames team={s.pair.players} />}
          rating={s.pair.rating}
        />
      )}
      {s.champion && (
        <ChampionLine
          icon="⭐"
          label="Top player"
          who={<PlayerLink name={s.champion.player} />}
          rating={s.champion.rating}
        />
      )}
      {!s.single && !s.pair && !s.champion && (
        <div className="text-sm text-gray-400">No champions yet</div>
      )}
    </div>
  </li>
);

/** The champions of the last season that ended, at the top of the page. */
const Reigning = ({ s }: { s: SeasonChampion }) => {
  const card = (format: string, who: ReactNode, rating: number) => (
    <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm p-4 min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">
        <span aria-hidden>👑</span> {format} champion
        {format === "2v2" ? "s" : ""}
      </div>
      <div className="mt-1 text-xl font-bold truncate">{who}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Season {s.season} · rating {Math.round(rating)}
      </div>
    </div>
  );
  if (!s.single && !s.pair) return null;
  return (
    <section aria-labelledby="reigning" className="mb-6">
      <h2 id="reigning" className="font-bold mb-2 px-1">
        Reigning champions
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {s.single &&
          card("1v1", <PlayerLink name={s.single.player} />, s.single.rating)}
        {s.pair &&
          card("2v2", <PlayerNames team={s.pair.players} />, s.pair.rating)}
      </div>
    </section>
  );
};

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
          Reigning champions, all-time records and every season&apos;s winners
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

      {data?.reigning && <Reigning s={data.reigning} />}

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
            1v1 and 2v2 champions are the best-rated single player and pair at
            the end of the season (at least {PAIR_MIN_MATCHES} matches); the top
            player has the best individual rating across both formats (at least{" "}
            {PROVISIONAL_MATCHES} matches).
          </p>
        </section>
      )}
    </>
  );
};

export default HallOfFame;
