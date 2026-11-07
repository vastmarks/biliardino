import { FormEvent, useEffect, useState } from "react";
import { Modal } from "~/components/Elements/Modal";
import type { MatchRowData } from "~/components/Elements/MatchTable";
import { parsePlayers } from "~/utils/playerStats";
import { toast } from "~/utils/toast";
import { trpc } from "~/utils/trpc";

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 2);
const field =
  "w-full h-11 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none";

/**
 * Correct a saved match: who played and the result. (A 1v1 stays a 1v1 and a 2v2 a 2v2.)
 * Native selects are fine here: editing is rare and the player is already known.
 */
export const MatchEditDialog = ({
  match,
  onClose,
}: {
  match: MatchRowData | null;
  onClose: () => void;
}) => {
  const roster = trpc.players.all.useQuery(undefined, {
    enabled: match !== null,
  });
  const utils = trpc.useUtils();
  const [side1, setSide1] = useState<number[]>([]);
  const [side2, setSide2] = useState<number[]>([]);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [comment, setComment] = useState("");

  // fill the form whenever another match is opened
  useEffect(() => {
    if (!match || !roster.data) return;
    const idsOf = (team: string) =>
      parsePlayers(team).map(k => roster.data.find(p => p.key === k)?.id ?? 0);
    setSide1(idsOf(match.team1));
    setSide2(idsOf(match.team2));
    setScore1(String(match.score1));
    setScore2(String(match.score2));
    setComment(match.comment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, roster.data]);

  const refresh = () =>
    Promise.all([
      utils.matches.invalidate(),
      utils.dashboard.invalidate(),
      utils.players.invalidate(),
      utils.teams.invalidate(),
    ]);
  const update = trpc.matches.update.useMutation({
    onSuccess: async () => {
      await refresh();
      toast("Match corrected", { type: "success" });
      onClose();
    },
    onError: err => toast(err.message, { type: "error" }),
  });
  const remove = trpc.matches.delete.useMutation({
    onSuccess: async () => {
      await refresh();
      toast("Match deleted", { type: "success" });
      onClose();
    },
    onError: err => toast(err.message, { type: "error" }),
  });

  const ready =
    [...side1, ...side2].every(id => id > 0) &&
    new Set([...side1, ...side2]).size === side1.length + side2.length &&
    score1 !== "" &&
    score2 !== "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!match || !ready || update.isPending) return;
    update.mutate({
      id: match.id,
      players1: side1,
      players2: side2,
      score1,
      score2,
      comment,
    });
  };

  const picker = (side: number[], set: (s: number[]) => void, label: string) =>
    side.map((id, i) => (
      <select
        key={i}
        aria-label={`${label} player ${i + 1}`}
        value={id}
        onChange={e => set(side.map((x, j) => (j === i ? +e.target.value : x)))}
        className={field}
      >
        {id === 0 && <option value={0}>Choose…</option>}
        {(roster.data ?? []).map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.archived ? " (archived)" : ""}
          </option>
        ))}
      </select>
    ));

  return (
    <Modal open={match !== null} onClose={onClose} title="Correct match">
      {match && (
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2 content-start">
              <div className="text-xs text-gray-500">Team 1</div>
              {picker(side1, setSide1, "Team 1")}
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Team 1 score"
                value={score1}
                onChange={e => setScore1(digits(e.target.value))}
                className={`${field} text-center text-2xl font-bold h-14`}
              />
            </div>
            <div className="grid gap-2 content-start">
              <div className="text-xs text-gray-500">Team 2</div>
              {picker(side2, setSide2, "Team 2")}
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Team 2 score"
                value={score2}
                onChange={e => setScore2(digits(e.target.value))}
                className={`${field} text-center text-2xl font-bold h-14`}
              />
            </div>
          </div>
          <input
            type="text"
            maxLength={500}
            placeholder="Note (optional)"
            aria-label="Note"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className={field}
          />
          <p className="text-xs text-gray-500">
            Ratings of the whole season are recalculated. Achievements earned
            with a changed result are removed.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete this match (${match.score1}:${match.score2})? This can't be undone.`,
                  )
                ) {
                  remove.mutate({ id: match.id });
                }
              }}
              className="h-11 px-3 rounded-lg text-red-600 border border-red-300 dark:border-red-800"
            >
              Delete
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ready || update.isPending}
              className="h-11 px-5 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-40"
            >
              {update.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
