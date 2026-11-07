import { FunctionComponent, useMemo } from "react";
import { LineChart } from "~/components/Elements/LineChart";
import { defaultRating } from "~/utils/elo";
import type { RatingPoint } from "~/utils/playerStats";

export const PlayerRatingHistory: FunctionComponent<{
  name: string;
  history: RatingPoint[];
}> = ({ name, history }) => {
  const series = useMemo(
    () => [
      {
        id: name,
        label: name,
        color: "#65a30d",
        values: [defaultRating, ...history.map(h => h.rating)],
      },
    ],
    [name, history],
  );
  return (
    <LineChart
      series={series}
      baseline={defaultRating}
      stepLabel="After match"
    />
  );
};
