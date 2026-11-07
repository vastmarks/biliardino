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
    <label className="text-xs uppercase font-light opacity-60 flex items-center gap-1">
      Season
      <select
        className="bg-transparent uppercase text-base sm:text-xs"
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
