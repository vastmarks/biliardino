import type { GetServerSideProps } from "next";
import Link from "next/link";
import { trpc } from "~/utils/trpc";
import { PageTitle } from "~/components/Elements/PageTitle";
import { MatchTable } from "~/components/Elements/MatchTable";
import { MatchEntry } from "~/components/Dashboard/MatchEntry";
import { Leaderboard } from "~/components/Dashboard/Leaderboard";
import { Pairs } from "~/components/Dashboard/Pairs";
import { Tiles } from "~/components/Dashboard/Tiles";
import { useStore } from "~/utils/store";
import { loadDashboard, DashboardData } from "~/server/model/dashboard";

export const getServerSideProps: GetServerSideProps<{
  initial: DashboardData;
}> = async ({ res }) => {
  res.setHeader("Cache-Control", "private, no-cache");
  return { props: { initial: await loadDashboard() } };
};

const Home = ({ initial }: { initial: DashboardData }) => {
  const picked = useStore(s => s.seasonPicked);
  const stored = useStore(s => s.season);
  const season = picked ? stored : initial.season;

  const { data = initial } = trpc.dashboard.get.useQuery(
    { season },
    {
      initialData: season === initial.season ? initial : undefined,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      placeholderData: prev => prev,
    },
  );

  // the name lookups used by PlayerLink / TeamLink come for free with the page
  trpc.players.all.useQuery(undefined, {
    initialData: [...initial.roster].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4">
      <PageTitle />
      <MatchEntry
        roster={data.roster}
        season={data.season}
        isCurrentSeason={data.season === initial.season}
      />
      <Leaderboard boards={data.boards} />
      <Pairs pairs={data.pairs} />
      <Tiles tiles={data.tiles} />
      {data.recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-bold">Recent matches</h2>
            <Link href="/matches" className="text-sm text-blue-500">
              All matches →
            </Link>
          </div>
          <MatchTable matches={data.recent} />
        </section>
      )}
    </div>
  );
};

export default Home;
