import { trpc } from "~/utils/trpc";
import { useRouter } from "next/router";
import { LoadingIndicator, PageTitle } from "~/components/Elements";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Profile } from "~/components/Elements/Profile";
import { useStore } from "~/utils/store";
import { parsePlayers } from "~/utils/playerStats";
import { PlayerLink } from "~/components/Elements";

const Team = () => {
  const teamName = useRouter().query.name as string;
  const [versus, setVersus] = useState<string | null>(null);
  const { data: team, isLoading } = trpc.teams.byId.useQuery({
    name: teamName,
  });
  const { data: teams } = trpc.teams.list.useQuery({
    teamsize: team?.teamsize || 1,
  });
  const { data: versusTeam } = trpc.teams.byId.useQuery(
    {
      name: versus || "",
    },
    {
      placeholderData: keepPreviousData,
      enabled: !!versus && versus !== "",
    },
  );
  const selectedSeason = useStore(state => state.season);
  const { data: matches } = trpc.matches.list.useQuery({
    team1: teamName,
    team2: versus !== "" ? versusTeam?.name : undefined,
    limit: 0,
    season: selectedSeason,
  });

  if (!team || isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  const onVersusSelect = async (teamName: string) => {
    setVersus(teamName);
  };

  return (
    <>
      <PageTitle title={team ? team.name : "Team"} />
      <div className="text-sm opacity-70 mb-2 flex gap-2 flex-wrap">
        Players:
        {parsePlayers(team.name).map(p => (
          <PlayerLink key={p} name={p} />
        ))}
      </div>
      <Profile
        team={team}
        versus={versus ? versusTeam : undefined}
        matches={matches}
        onVersusSelect={onVersusSelect}
        versusOptions={teams || []}
      />
    </>
  );
};

export default Team;
