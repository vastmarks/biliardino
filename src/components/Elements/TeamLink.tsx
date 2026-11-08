import { FunctionComponent } from "react";
import type { Team } from "~/generated/prisma/browser";
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
