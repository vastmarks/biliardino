import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Card,
  LoadingIndicator,
  PageTitle,
  PlayerTable,
} from "~/components/Elements";
import { trpc } from "~/utils/trpc";
import { useStore } from "~/utils/store";

const Players = () => {
  const selectedSeason = useStore(state => +state.season);
  const [allTime, setAllTime] = useState(false);
  const { data, isLoading } = trpc.players.list.useQuery(
    { season: allTime ? "all" : selectedSeason },
    { placeholderData: keepPreviousData },
  );

  const tab = (active: boolean) =>
    `px-3 py-1 rounded-lg text-sm font-semibold ${
      active
        ? "bg-blue-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 opacity-70 hover:opacity-100"
    }`;

  return (
    <>
      <PageTitle title="Players" />
      <div className="my-2 flex gap-2">
        <button className={tab(!allTime)} onClick={() => setAllTime(false)}>
          Season {selectedSeason}
        </button>
        <button className={tab(allTime)} onClick={() => setAllTime(true)}>
          All time
        </button>
      </div>
      <Card>
        {isLoading || !data ? (
          <div className="h-32 flex items-center justify-center">
            <LoadingIndicator />
          </div>
        ) : data.length === 0 ? (
          <div className="p-6 text-center italic opacity-50">
            No players yet. Play a match!
          </div>
        ) : (
          <PlayerTable players={data} />
        )}
      </Card>
      <p className="text-xs opacity-60 mt-2">
        Player ratings are Elo ratings calculated from every match a player took
        part in: a team counts with the average rating of its players. * =
        provisional (fewer than 5 matches).
      </p>
    </>
  );
};

export default Players;
