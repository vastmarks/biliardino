import { FunctionComponent, useMemo } from "react";
import { LineSeries, ResponsiveLine } from "@nivo/line";
import { useTheme } from "next-themes";
import { defaultRating } from "~/utils/elo";
import type { RatingPoint } from "~/utils/playerStats";

export const PlayerRatingHistory: FunctionComponent<{
  name: string;
  history: RatingPoint[];
}> = ({ name, history }) => {
  const { resolvedTheme } = useTheme();
  const data: LineSeries[] = useMemo(
    () => [
      {
        id: name,
        data: [
          { x: 0, y: defaultRating },
          ...history.map((h, i) => ({ x: i + 1, y: h.rating })),
        ],
      },
    ],
    [name, history],
  );

  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 8, right: 8, bottom: 22, left: 50 }}
      yScale={{ type: "linear", min: "auto", max: "auto" }}
      xScale={{ type: "linear", min: 0, max: "auto" }}
      animate={false}
      colors={["#65a30d"]}
      curve="monotoneX"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        legend: "matches",
        legendOffset: 18,
        legendPosition: "middle",
        tickSize: 0,
      }}
      enablePoints={history.length < 60}
      pointSize={5}
      enableGridX={false}
      useMesh={true}
      tooltip={({ point }) => (
        <div className="bg-gray-200 dark:bg-gray-800 p-2 text-sm shadow rounded">
          Match {point.data.x as number}:{" "}
          <b>{(point.data.y as number).toFixed(0)}</b>
        </div>
      )}
      theme={
        resolvedTheme === "dark"
          ? {
              axis: {
                ticks: { text: { fill: "#9ca3af" } },
                legend: { text: { fill: "#9ca3af" } },
              },
              grid: { line: { stroke: "#4b5563", strokeWidth: 1 } },
            }
          : {}
      }
    />
  );
};
