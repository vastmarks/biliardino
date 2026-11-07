import { ReactNode } from "react";
import { PlayerLink } from "~/components/Elements/PlayerLink";
import type { Tiles as TilesData } from "~/utils/dashboard";

const Tile = ({
  icon,
  label,
  children,
  sub,
}: {
  icon: string;
  label: string;
  children: ReactNode;
  sub: string;
}) => (
  <div className="rounded-lg bg-white dark:bg-gray-800 shadow p-3 min-w-0">
    <div className="text-[11px] uppercase tracking-wide text-gray-400">
      <span aria-hidden>{icon}</span> {label}
    </div>
    <div className="mt-1 font-bold truncate">{children}</div>
    <div className="text-xs text-gray-500">{sub}</div>
  </div>
);

const names = (keys: string[]) =>
  keys.map((k, i) => (
    <span key={k}>
      {i > 0 && " & "}
      <PlayerLink name={k} />
    </span>
  ));

export const Tiles = ({ tiles }: { tiles: TilesData }) => {
  const { streak, gain, upset, active } = tiles;
  if (!streak && !gain && !upset && !active) return null;
  return (
    <section className="grid grid-cols-2 gap-3">
      {streak && (
        <Tile
          icon="🔥"
          label="Hot streak"
          sub={`${streak.length} wins in a row`}
        >
          <PlayerLink name={streak.player} />
        </Tile>
      )}
      {gain && (
        <Tile
          icon="📈"
          label="Rising"
          sub={`+${Math.round(gain.delta)} in ${gain.matches} match${gain.matches === 1 ? "" : "es"} this week`}
        >
          <PlayerLink name={gain.player} />
        </Tile>
      )}
      {upset && (
        <Tile
          icon="😱"
          label="Biggest upset"
          sub={`${upset.winnerScore}:${upset.loserScore} over ${upset.losers.length > 1 ? "the favourites" : "the favourite"}`}
        >
          {names(upset.winners)}
        </Tile>
      )}
      {active && (
        <Tile
          icon="⚡"
          label="Most active"
          sub={`${active.matches} matches this week, ${active.wins} won`}
        >
          <PlayerLink name={active.player} />
        </Tile>
      )}
    </section>
  );
};
