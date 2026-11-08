import { trpc } from "~/utils/trpc";
import { Card, MatchTable, PageTitle } from "~/components/Elements";
import { keepPreviousData } from "@tanstack/react-query";
import { useStore } from "~/utils/store";
import { useRouter } from "next/router";

type Format = "" | "1v1" | "2v2";
const FORMATS: Array<{ value: Format; label: string }> = [
  { value: "", label: "All" },
  { value: "1v1", label: "1v1" },
  { value: "2v2", label: "2v2" },
];

const selectClass =
  "h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-sm";

/**
 * Every match, newest first. Filters: format, player and season. They live in the address
 * (`/matches?player=anna&format=2v2&season=all`), so a filtered list can be bookmarked or
 * linked to, e.g. "all matches" on a player's profile.
 */
const Matches = () => {
  const router = useRouter();
  const headerSeason = useStore(state => +state.season);
  const q = router.query;
  const format: Format =
    q.format === "1v1" || q.format === "2v2" ? q.format : "";
  const player = typeof q.player === "string" ? q.player : "";
  // no season in the address = the one picked in the header
  const season: number | "all" =
    q.season === "all"
      ? "all"
      : typeof q.season === "string" && /^\d+$/.test(q.season)
        ? +q.season
        : headerSeason;

  const setFilter = (key: string, value: string) => {
    const next = { ...router.query, [key]: value };
    if (!value) delete next[key];
    router.replace({ pathname: router.pathname, query: next }, undefined, {
      shallow: true,
    });
  };

  const {
    data: matches,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.matches.infiniteList.useInfiniteQuery(
    {
      limit: 25,
      player: player || undefined,
      format: format || undefined,
      season,
    },
    {
      enabled: router.isReady,
      initialCursor: undefined,
      getNextPageParam: lastPage => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    },
  );
  const roster = trpc.players.all.useQuery();
  const seasons = trpc.seasons.list.useQuery();
  const items = matches?.pages.flatMap(p => p.items) ?? [];
  const filtered = format !== "" || player !== "";

  return (
    <>
      <PageTitle title="Matches" />
      <div className="my-3 flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Format"
          className="inline-flex h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5"
        >
          {FORMATS.map(f => (
            <button
              key={f.value}
              type="button"
              aria-pressed={format === f.value}
              onClick={() => setFilter("format", f.value)}
              className={`px-3 rounded-md text-sm ${
                format === f.value
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Player"
          className={selectClass}
          value={player}
          onChange={e => setFilter("player", e.target.value)}
        >
          <option value="">All players</option>
          {(roster.data ?? [])
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(p => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
        </select>
        {(seasons.data?.length ?? 0) > 1 && (
          <select
            aria-label="Season"
            className={selectClass}
            value={String(season)}
            onChange={e => setFilter("season", e.target.value)}
          >
            {(seasons.data ?? []).map(s => (
              <option key={s.id} value={s.number}>
                Season {s.number}
              </option>
            ))}
            <option value="all">All seasons</option>
          </select>
        )}
        {filtered && (
          <button
            type="button"
            onClick={() =>
              router.replace(
                {
                  pathname: router.pathname,
                  query: q.season ? { season: q.season } : {},
                },
                undefined,
                { shallow: true },
              )
            }
            className="text-sm text-blue-500 dark:text-blue-300 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      <Card>
        {matches && items.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">
            No matches {filtered ? "for these filters" : "yet"}.
          </p>
        ) : (
          <MatchTable matches={items} />
        )}
        {hasNextPage && (
          <div className="border-t border-gray-100 dark:border-gray-800 text-center p-2">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-sm uppercase block w-full text-center"
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </Card>
    </>
  );
};

export default Matches;
