import type { FunctionComponent } from "react";
import { useMemo } from "react";
import type { Match } from "~/generated/prisma/browser";
import { LineChart } from "~/components/Elements/LineChart";

const COLORS = ["#65a30d", "#0891b2"]; // lime-600, cyan-600

export const EloHistory: FunctionComponent<{
  matches: Match[];
  teams: string[];
  labels?: string[];
}> = ({ teams, matches, labels }) => {
  const series = useMemo(() => {
    const ordered = [...matches].sort(
      (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) || a.id - b.id,
    );
    return teams.map((t, i) => ({
      id: t,
      label: labels?.[i] ?? t,
      color: COLORS[i % COLORS.length],
      values: ordered.map(m => (m.team1 === t ? m.team1Rating : m.team2Rating)),
    }));
  }, [teams, matches, labels]);

  return <LineChart series={series} />;
};
