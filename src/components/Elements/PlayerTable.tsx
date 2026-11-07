import { FunctionComponent, useMemo, useState } from "react";
import { PlayerLink } from "~/components/Elements/PlayerLink";
import type { PlayerStats } from "~/utils/playerStats";

type Summary = Omit<PlayerStats, "partners" | "opponents" | "history">;
type SortKey =
  "rating" | "matches" | "wins" | "losses" | "winRate" | "goalDifference";

export function formatStreak(streak: PlayerStats["currentStreak"]) {
  return streak.type ? `${streak.type}${streak.length}` : "-";
}

export const PlayerTable: FunctionComponent<{ players: Summary[] }> = ({
  players,
}) => {
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...players].sort(
      (a, b) =>
        b[sortBy] - a[sortBy] ||
        b.rating - a.rating ||
        a.name.localeCompare(b.name),
    );
    return desc ? list : list.reverse();
  }, [players, sortBy, desc]);

  const header = (key: SortKey, label: string) => (
    <th
      className="p-3 cursor-pointer select-none whitespace-nowrap"
      onClick={() => {
        if (key === sortBy) {
          setDesc(!desc);
        } else {
          setSortBy(key);
          setDesc(true);
        }
      }}
    >
      {label} {sortBy === key ? (desc ? "▼" : "▲") : ""}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full rounded-lg dark:bg-gray-700">
        <thead className="text-left">
          <tr className="bg-gray-200 dark:bg-gray-600 text-sm">
            <th className="p-3">#</th>
            <th className="p-3">Player</th>
            {header("rating", "Rating")}
            {header("matches", "Matches")}
            {header("wins", "W")}
            {header("losses", "L")}
            {header("winRate", "Win %")}
            {header("goalDifference", "+/−")}
            <th className="p-3">Streak</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, index) => (
            <tr
              key={p.name}
              className={index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800" : ""}
            >
              <td className="p-3 opacity-50">{index + 1}</td>
              <td className="p-3 font-semibold">
                <PlayerLink name={p.name} />
              </td>
              <td className={`p-3 ${p.provisional ? "opacity-60" : ""}`}>
                {p.rating.toFixed(0)}
                {p.provisional && (
                  <span title="Provisional: fewer than 5 matches"> *</span>
                )}
              </td>
              <td className="p-3">{p.matches}</td>
              <td className="p-3">{p.wins}</td>
              <td className="p-3">{p.losses}</td>
              <td className="p-3">{(p.winRate * 100).toFixed(0)}%</td>
              <td
                className={`p-3 ${
                  p.goalDifference > 0
                    ? "text-green-500"
                    : p.goalDifference < 0
                      ? "text-red-500"
                      : ""
                }`}
              >
                {p.goalDifference > 0 ? "+" : ""}
                {p.goalDifference}
              </td>
              <td
                className={`p-3 ${
                  p.currentStreak.type === "W"
                    ? "text-green-500"
                    : p.currentStreak.type === "L"
                      ? "text-red-500"
                      : ""
                }`}
              >
                {formatStreak(p.currentStreak)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
