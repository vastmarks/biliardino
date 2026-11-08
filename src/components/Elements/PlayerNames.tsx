import { FunctionComponent, Fragment } from "react";
import { PlayerLink } from "~/components/Elements/PlayerLink";
import { parsePlayers } from "~/utils/playerStats";

/**
 * The players of a team ("chiara,elena"), each name a link to that player's profile:
 * "Chiara & Elena". Wherever biliarDino shows a person, the name leads to them.
 */
export const PlayerNames: FunctionComponent<{ team: string | string[] }> = ({
  team,
}) => {
  const keys = typeof team === "string" ? parsePlayers(team) : team;
  return (
    <>
      {keys.map((key, i) => (
        <Fragment key={key}>
          {i > 0 && " & "}
          <PlayerLink name={key} />
        </Fragment>
      ))}
    </>
  );
};
