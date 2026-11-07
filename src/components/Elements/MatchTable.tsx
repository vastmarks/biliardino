import { FunctionComponent, useState } from "react";
import { MatchEditDialog } from "~/components/Elements/MatchEditDialog";
import { canModifyMatch } from "~/utils/editRules";
import { TimeDistance } from "~/components/Elements/TimeDistance";
import { TeamLink } from "~/components/Elements/TeamLink";
import { RatingChange } from "~/components/Elements/RatingChange";
import { achievements as allAchievements } from "~/utils/achievements";
import { useIsAdmin } from "~/utils/useIsAdmin";

export interface MatchRowData {
  id: number;
  createdAt: Date | string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  comment: string;
  team1RatingChange?: number;
  team2RatingChange?: number;
  achievements?: Array<{ teamName: string; achievement: string }>;
}

const achievementTitles = (list: MatchRowData["achievements"], team: string) =>
  allAchievements
    .filter(a => list?.some(x => x.teamName === team && x.achievement === a.id))
    .map(a => a.title)
    .join(", ");

const Side: FunctionComponent<{
  team: string;
  score: number;
  other: number;
  change?: number;
  badges: string;
  align: "left" | "right";
}> = ({ team, score, other, change, badges, align }) => {
  const won = score > other;
  return (
    <div
      className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""} ${
        won ? "font-semibold" : "text-gray-600 dark:text-gray-300"
      }`}
    >
      <div className="break-words">
        <TeamLink team={team} />
        {badges && (
          <span title={badges} aria-label={badges} className="ml-1">
            🏅
          </span>
        )}
      </div>
      {change !== undefined && change !== 0 && (
        <div className="leading-none">
          <RatingChange rating={change} />
        </div>
      )}
    </div>
  );
};

export const MatchRow: FunctionComponent<{
  match: MatchRowData;
  /** show the "correct" button */
  editable?: boolean;
  onEdit?: (match: MatchRowData) => void;
}> = ({ match, editable, onEdit }) => (
  <li className="px-3 py-2 sm:px-4">
    <div className="flex items-center gap-2 text-sm">
      <Side
        team={match.team1}
        score={match.score1}
        other={match.score2}
        change={match.team1RatingChange}
        badges={achievementTitles(match.achievements, match.team1)}
        align="right"
      />
      <div
        className="shrink-0 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 font-mono tabular-nums text-base"
        aria-label={`${match.score1} to ${match.score2}`}
      >
        {match.score1}
        <span className="text-gray-400 px-0.5">:</span>
        {match.score2}
      </div>
      <Side
        team={match.team2}
        score={match.score2}
        other={match.score1}
        change={match.team2RatingChange}
        badges={achievementTitles(match.achievements, match.team2)}
        align="left"
      />
    </div>
    <div className="mt-0.5 flex items-center justify-center gap-2 text-xs text-gray-500">
      <TimeDistance date={match.createdAt} />
      {match.comment !== "" && (
        <span className="truncate max-w-[60%]" title={match.comment}>
          💬 {match.comment}
        </span>
      )}
      {editable && (
        <button
          type="button"
          className="text-blue-500 px-2 py-1 -my-1"
          onClick={() => onEdit?.(match)}
          aria-label="Correct or delete this match"
        >
          ✎ Edit
        </button>
      )}
    </div>
  </li>
);

export const MatchTable: FunctionComponent<{ matches: MatchRowData[] }> = ({
  matches,
}) => {
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState<MatchRowData | null>(null);

  if (matches.length === 0) {
    return null;
  }

  return (
    <>
      <ul className="divide-y dark:divide-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
        {matches.map(match => (
          <MatchRow
            key={match.id}
            match={match}
            editable={canModifyMatch(match.createdAt, isAdmin)}
            onEdit={setEditing}
          />
        ))}
      </ul>
      <MatchEditDialog match={editing} onClose={() => setEditing(null)} />
    </>
  );
};
