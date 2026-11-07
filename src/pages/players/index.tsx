import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Card,
  LoadingIndicator,
  PageTitle,
  PlayerTable,
} from "~/components/Elements";
import { trpc } from "~/utils/trpc";
import { AddPlayerForm } from "~/components/Form";
import { PlayerLink } from "~/components/Elements";
import { useIsAdmin } from "~/utils/useIsAdmin";
import { toast } from "~/utils/toast";
import { useStore } from "~/utils/store";

const Players = () => {
  const selectedSeason = useStore(state => +state.season);
  const [allTime, setAllTime] = useState(false);
  const { data, isLoading } = trpc.players.list.useQuery(
    { season: allTime ? "all" : selectedSeason },
    { placeholderData: keepPreviousData },
  );

  const roster = trpc.players.all.useQuery();
  const isAdmin = useIsAdmin();
  const utils = trpc.useUtils();
  const remove = trpc.players.delete.useMutation({
    onSuccess: async () => {
      await utils.players.invalidate();
    },
    onError: err => toast(`Error: ${err.message}`, { type: "error" }),
  });
  const withMatches = new Set((data ?? []).map(p => p.name));
  const noMatchesYet = (roster.data ?? []).filter(p => !withMatches.has(p.key));

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
        <div className="p-4 border-b dark:border-gray-600">
          <AddPlayerForm />
        </div>
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
      {noMatchesYet.length > 0 && (
        <p className="text-sm mt-3">
          <span className="opacity-60">Not played yet: </span>
          {noMatchesYet.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <PlayerLink name={p.key} />
              {isAdmin && (
                <button
                  className="ml-1 text-red-500"
                  title={`Delete ${p.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete ${p.name}?`)) {
                      remove.mutate({ id: p.id });
                    }
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </p>
      )}
      <p className="text-xs opacity-60 mt-2">
        Player ratings are Elo ratings calculated from every match a player took
        part in: a team counts with the average rating of its players. * =
        provisional (fewer than 5 matches).
      </p>
    </>
  );
};

export default Players;
