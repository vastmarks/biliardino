import { FunctionComponent } from "react";
import Link from "next/link";
import { usePlayerNames } from "~/utils/usePlayerNames";

/** Link to a player's profile; `name` is the player's key (lower-case name). */
export const PlayerLink: FunctionComponent<{ name: string }> = ({ name }) => {
  const players = usePlayerNames();
  return (
    <Link
      href={`/players/${encodeURIComponent(name)}`}
      className="hover:underline capitalize"
    >
      {players.display(name)}
    </Link>
  );
};
