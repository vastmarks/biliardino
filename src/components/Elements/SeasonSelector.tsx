import { FunctionComponent, useEffect } from "react";
import { trpc } from "~/utils/trpc";
import { useStore } from "~/utils/store";

export const SeasonSelector: FunctionComponent = () => {
  const seasons = trpc.seasons.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
  const { season: selectedSeason, setSeason, setDefaultSeason } = useStore();

  useEffect(() => {
    if (seasons.data) {
      setDefaultSeason(seasons.data.find(s => s.current)?.number || 1);
    }
  }, [seasons.data, setDefaultSeason]);

  // nothing to choose from until a second season exists
  if (!seasons.data || seasons.data.length < 2) {
    return null;
  }

  return (
    // A small pill next to the logo. translate-y-1 (4px) centres it on the wordmark's letters
    // rather than on the logo image, whose box also holds the taller dino mark.
    <label className="translate-y-1 inline-flex h-7 items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 pl-3 pr-1 text-xs text-gray-500 dark:text-gray-400">
      Season
      <select
        className="bg-transparent font-semibold text-gray-700 dark:text-gray-200 text-base sm:text-xs cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        value={selectedSeason}
        onChange={e => setSeason(+e.target.value)}
      >
        {seasons.data.map(season => (
          <option key={season.id}>{season.number}</option>
        ))}
      </select>
    </label>
  );
};
