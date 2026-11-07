import { FunctionComponent } from "react";
import { Team } from "@prisma/client";
import Link from "next/link";
import { usePlayerNames } from "~/utils/usePlayerNames";

export const TeamLink: FunctionComponent<{ team: Team | string }> = ({
  team,
}) => {
  const players = usePlayerNames();
  if (typeof team === "object") {
    team = team.name;
  }
  return (
    <Link
      href={`/teams/${encodeURIComponent(team)}`}
      className="hover:underline capitalize"
    >
      {players.team(team)}
    </Link>
  );
};
