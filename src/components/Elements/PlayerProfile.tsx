import { FunctionComponent, ReactNode } from "react";
import { Card } from "~/components/Elements/Card";
import { MatchTable } from "~/components/Elements/MatchTable";
import { PlayerLink } from "~/components/Elements/PlayerLink";
import { PlayerRatingHistory } from "~/components/Elements/PlayerRatingHistory";
import { formatStreak } from "~/components/Elements/PlayerTable";
import type { MatchWithAchievements } from "~/server/model/match";
import type { PersonStat, PlayerStats } from "~/utils/playerStats";

const MIN_MATCHES_FOR_HIGHLIGHT = 3;

const Stat: FunctionComponent<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <h3 className="font-semibold">{children}</h3>
    <p className="text-sm">{label}</p>
  </div>
);

const Divider = () => (
  <div className="col-span-3 border-b -mx-3 my-2 dark:border-gray-600" />
);

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

const PeopleTable: FunctionComponent<{ title: string; rows: PersonStat[] }> = ({
  title,
  rows,
}) => (
  <div className="p-3">
    <h3 className="text-sm uppercase text-gray-400 mb-2">{title}</h3>
    {rows.length === 0 ? (
      <p className="italic opacity-50 text-sm">Nothing yet</p>
    ) : (
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="opacity-60">
            <th className="py-1">Player</th>
            <th className="py-1">Matches</th>
            <th className="py-1">W-L</th>
            <th className="py-1">Win %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.player} className="border-t dark:border-gray-600">
              <td className="py-1">
                <PlayerLink name={r.player} />
              </td>
              <td className="py-1">{r.matches}</td>
              <td className="py-1">
                {r.wins}-{r.losses}
                {r.draws > 0 ? `-${r.draws}` : ""}
              </td>
              <td className="py-1">{pct(r.winRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export const PlayerProfile: FunctionComponent<{
  player: PlayerStats;
  rank: number;
  recentMatches: MatchWithAchievements[];
  scopeLabel: string;
}> = ({ player, rank, recentMatches, scopeLabel }) => {
  const eligible = (list: PersonStat[]) =>
    list.filter(p => p.matches >= MIN_MATCHES_FOR_HIGHLIGHT);
  const bestPartner = [...eligible(player.partners)].sort(
    (a, b) => b.winRate - a.winRate || b.matches - a.matches,
  )[0];
  const nemesis = [...eligible(player.opponents)].sort(
    (a, b) => a.winRate - b.winRate || b.matches - a.matches,
  )[0];

  return (
    <Card>
      <div className="grid grid-cols-6 relative">
        <div className="col-span-6 bg-gray-100 dark:bg-gray-600 flex items-center justify-between rounded-t px-3">
          <h2 className="bg-white px-2 font-semibold text-2xl my-5 text-gray-800 rounded-lg block capitalize">
            {player.name}
          </h2>
          <div className="text-sm opacity-70 text-right">
            <div>{scopeLabel}</div>
            <div>Rank #{rank}</div>
          </div>
        </div>

        <div className="col-span-6 border-b dark:border-gray-600 pb-3">
          <div className="grid grid-cols-3 gap-3 p-3">
            <Stat label="Current rating">
              {player.rating.toFixed(0)}
              {player.provisional && (
                <small
                  className="opacity-50 ml-1"
                  title="Provisional: fewer than 5 matches"
                >
                  *
                </small>
              )}
            </Stat>
            <Stat label="Highest rating">
              {player.highestRating.toFixed(0)}
            </Stat>
            <Stat label="Lowest rating">{player.lowestRating.toFixed(0)}</Stat>
            <Divider />
            <Stat label="Matches">{player.matches}</Stat>
            <Stat label="Wins">{player.wins}</Stat>
            <Stat label="Losses">{player.losses}</Stat>
            <Stat label="Win rate">{pct(player.winRate)}</Stat>
            <Stat label="Goals for / against">
              {player.goalsFor} / {player.goalsAgainst}
            </Stat>
            <Stat label="Goal difference">
              {player.goalDifference > 0 ? "+" : ""}
              {player.goalDifference}
            </Stat>
            <Stat label="Avg. goals scored">
              {player.avgGoalsFor.toFixed(2)}
            </Stat>
            <Stat label="Avg. goals conceded">
              {player.avgGoalsAgainst.toFixed(2)}
            </Stat>
            <Stat label="Draws">{player.draws}</Stat>
            <Divider />
            <Stat label="Current streak">
              {formatStreak(player.currentStreak)}
            </Stat>
            <Stat label="Longest win streak">{player.longestWinStreak}</Stat>
            <Stat label="Longest losing streak">
              {player.longestLosingStreak}
            </Stat>
          </div>
        </div>

        <div className="col-span-6 border-b dark:border-gray-600 p-3">
          <h3 className="text-sm uppercase text-gray-400 mb-2">By format</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(player.formats)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([format, r]) => (
                <div
                  key={format}
                  className="border rounded px-3 py-2 dark:border-gray-600 text-sm"
                >
                  <b>{format}</b> — {r.matches} played, {r.wins}-{r.losses}
                  {r.draws > 0 ? `-${r.draws}` : ""} ({pct(r.winRate)})
                </div>
              ))}
          </div>
          {(bestPartner || nemesis) && (
            <div className="mt-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
              {bestPartner && (
                <span>
                  🤝 Best partner: <PlayerLink name={bestPartner.player} /> (
                  {pct(bestPartner.winRate)} over {bestPartner.matches})
                </span>
              )}
              {nemesis && (
                <span>
                  😈 Toughest opponent: <PlayerLink name={nemesis.player} /> (
                  {pct(nemesis.winRate)} over {nemesis.matches})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="col-span-6 h-52 border-b dark:border-gray-600">
          {player.history.length > 1 ? (
            <PlayerRatingHistory name={player.name} history={player.history} />
          ) : (
            <div className="h-52 flex justify-center items-center italic opacity-50">
              Play a few more matches to see a rating history
            </div>
          )}
        </div>

        <div className="col-span-6 md:col-span-3 border-b md:border-b-0 md:border-r dark:border-gray-600">
          <PeopleTable title="Partners" rows={player.partners} />
        </div>
        <div className="col-span-6 md:col-span-3">
          <PeopleTable title="Opponents" rows={player.opponents} />
        </div>

        {recentMatches.length > 0 && (
          <div className="col-span-6 border-t dark:border-gray-600">
            <h3 className="text-sm uppercase text-gray-400 p-3">
              Recent matches
            </h3>
            <MatchTable matches={recentMatches} />
          </div>
        )}
      </div>
    </Card>
  );
};
