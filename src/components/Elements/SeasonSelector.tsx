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
    if (!seasons.data) return;
    const current = seasons.data.find(s => s.current)?.number || 1;
    // a season that was deleted or renumbered since it was picked: back to the current one
    if (!seasons.data.some(s => s.number === selectedSeason)) {
      useStore.setState({ season: current, seasonPicked: false });
    } else {
      setDefaultSeason(current);
    }
  }, [seasons.data, selectedSeason, setDefaultSeason]);

  // nothing to choose from until a second season exists
  if (!seasons.data || seasons.data.length < 2) {
    return null;
  }

  return (
    // A small pill next to the logo. translate-y-1 (4px) puts its text on the wordmark's baseline.
    <label className="translate-y-1 inline-flex h-7 items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 pl-3 pr-1 text-xs text-gray-500 dark:text-gray-400">
      Season
      <select
        className="bg-transparent font-semibold text-gray-700 dark:text-gray-200 text-base sm:text-xs cursor-pointer rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40"
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
