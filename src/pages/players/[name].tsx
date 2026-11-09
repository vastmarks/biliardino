import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  LoadingIndicator,
  PageTitle,
  PlayerProfile,
} from "~/components/Elements";
import { trpc } from "~/utils/trpc";
import { useStore } from "~/utils/store";

const Player = () => {
  const router = useRouter();
  const name = router.query.name as string | undefined;
  const selectedSeason = useStore(state => +state.season);
  const [allTime, setAllTime] = useState(false);
  const { data, isLoading } = trpc.players.byName.useQuery(
    { name: name ?? "", season: allTime ? "all" : selectedSeason },
    { enabled: !!name },
  );

  const tab = (active: boolean) =>
    `px-3 py-1 rounded-lg text-sm font-semibold ${
      active
        ? "bg-blue-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 opacity-70 hover:opacity-100"
    }`;

  return (
    <>
      <PageTitle title={name ? name : "Player"} />
      <div className="my-2 flex gap-2 items-center">
        <button className={tab(!allTime)} onClick={() => setAllTime(false)}>
          Season {selectedSeason}
        </button>
        <button className={tab(allTime)} onClick={() => setAllTime(true)}>
          All time
        </button>
        <Link
          href="/players"
          className="ml-auto text-sm opacity-70 hover:opacity-100"
        >
          ← All players
        </Link>
      </div>
      {isLoading || !name ? (
        <div className="h-32 flex items-center justify-center">
          <LoadingIndicator />
        </div>
      ) : !data ? (
        <div className="p-6 text-center italic opacity-60">
          No matches found for “{name}”{" "}
          {allTime ? "yet" : `in season ${selectedSeason}`}.
        </div>
      ) : (
        <PlayerProfile
          player={data.player}
          rank={data.rank}
          recentMatches={data.recentMatches}
          achievements={data.achievements}
          scopeLabel={allTime ? "All time" : `Season ${selectedSeason}`}
        />
      )}
    </>
  );
};

export default Player;
