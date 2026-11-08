import Link from "next/link";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "~/utils/trpc";
import {
  Card,
  LoadingIndicator,
  TeamTable,
  PageTitle,
} from "~/components/Elements";

/** A team is one player (1v1) or a pair (2v2). */
const TYPES = [
  { size: 1, label: "Singles", hint: "1v1" },
  { size: 2, label: "Pairs", hint: "2v2" },
];

const Teams = () => {
  const [teamsize, setTeamsize] = useState(1);
  const { data, isLoading } = trpc.teams.list.useQuery(
    { teamsize },
    { placeholderData: keepPreviousData },
  );

  return (
    <>
      <PageTitle title="Teams" />
      <div className="my-2 flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="tablist" aria-label="Team type">
          {TYPES.map(t => (
            <button
              key={t.size}
              role="tab"
              aria-selected={teamsize === t.size}
              onClick={() => setTeamsize(t.size)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                teamsize === t.size
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 opacity-70 hover:opacity-100"
              }`}
            >
              {t.label}{" "}
              <span className="font-normal opacity-80">({t.hint})</span>
            </button>
          ))}
        </div>
        <Link
          href="/help#teams"
          className="ml-auto text-sm text-blue-500 dark:text-blue-300 hover:underline"
        >
          What do the columns mean?
        </Link>
      </div>
      <Card>
        {isLoading || !data ? (
          <div className="flex justify-center">
            <LoadingIndicator />
          </div>
        ) : (
          <TeamTable teams={data} />
        )}
      </Card>
    </>
  );
};

export default Teams;
