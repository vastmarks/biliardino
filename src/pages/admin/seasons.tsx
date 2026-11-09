import { useState } from "react";
import { AdminLayout } from "~/components/Layout/AdminLayout";
import { Modal } from "~/components/Elements/Modal";
import { trpc } from "~/utils/trpc";
import { toast } from "~/utils/toast";
import type { RouterOutputs } from "~/utils/trpc";

type Season = RouterOutputs["seasons"]["list"][number];

const primary =
  "h-11 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-40";
const secondary = "h-11 px-4 rounded-lg bg-gray-200 dark:bg-gray-700";
const danger =
  "h-11 px-4 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-40";
const small = "h-9 px-3 rounded-lg text-sm font-semibold";

const day = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "12 Sept 2026 – 30 Oct 2026", "since 12 Sept 2026", or nothing yet */
function period(s: Season): string {
  if (!s.firstMatchAt || !s.lastMatchAt) return "No matches yet";
  const from = day(s.firstMatchAt);
  if (s.current) return `Since ${from}`;
  const to = day(s.lastMatchAt);
  return from === to ? from : `${from} – ${to}`;
}

/**
 * Seasons (admin). A season's dates are those of its first and last match. Starting a new
 * season makes it the current one: new matches count there and ratings start at 1000 again.
 */
const Seasons = () => {
  const seasons = trpc.seasons.list.useQuery();
  const utils = trpc.useUtils();
  const [dialog, setDialog] = useState<
    | { kind: "start" }
    | { kind: "renumber"; season: Season }
    | { kind: "activate"; season: Season }
    | { kind: "delete"; season: Season }
    | null
  >(null);
  const [typed, setTyped] = useState("");
  const close = () => {
    setDialog(null);
    setTyped("");
  };
  // everything that shows season numbers or ratings
  const refresh = () => utils.invalidate();
  const onError = (err: { message: string }) =>
    toast(err.message, { type: "error" });

  const start = trpc.seasons.start.useMutation({
    onSuccess: async s => {
      await refresh();
      toast(`Season ${s.number} started`, { type: "success" });
      close();
    },
    onError,
  });
  const renumber = trpc.seasons.renumber.useMutation({
    onSuccess: async s => {
      await refresh();
      toast(`Now season ${s.number}`, { type: "success" });
      close();
    },
    onError,
  });
  const activate = trpc.seasons.activate.useMutation({
    onSuccess: async s => {
      await refresh();
      toast(`Season ${s.number} is the current season again`, {
        type: "success",
      });
      close();
    },
    onError,
  });
  const remove = trpc.seasons.delete.useMutation({
    onSuccess: async r => {
      await refresh();
      toast(
        r.deletedMatches
          ? `Season ${r.number} and its ${r.deletedMatches} matches deleted`
          : `Season ${r.number} deleted`,
        { type: "success" },
      );
      close();
    },
    onError,
  });

  const list = seasons.data ?? [];
  const current = list.find(s => s.current);
  const next = Math.max(0, ...list.map(s => s.number)) + 1;
  const target = dialog && dialog.kind !== "start" ? dialog.season : null;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-lg font-bold">Seasons</h1>
        <button
          className={primary}
          disabled={!seasons.data}
          onClick={() => setDialog({ kind: "start" })}
        >
          Start season {next}
        </button>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        {list.map(s => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <div className="flex-1 min-w-[12rem]">
              <div className="font-semibold">
                Season {s.number}
                {s.current && (
                  <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white align-middle">
                    Current
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {period(s)}
                {s.matches > 0 &&
                  ` · ${s.matches} ${s.matches === 1 ? "match" : "matches"}`}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className={`${small} text-blue-500 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700`}
                onClick={() => {
                  setTyped(String(s.number));
                  setDialog({ kind: "renumber", season: s });
                }}
              >
                Change number
              </button>
              {!s.current && (
                <>
                  <button
                    className={`${small} text-blue-500 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700`}
                    onClick={() => setDialog({ kind: "activate", season: s })}
                  >
                    Make current
                  </button>
                  <button
                    className={`${small} text-red-500 hover:bg-red-500/10`}
                    onClick={() => setDialog({ kind: "delete", season: s })}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-2 px-1">
        The current season can&apos;t be deleted; make another season current
        first. Past seasons stay in the Hall of Fame.
      </p>

      <Modal
        open={dialog?.kind === "start"}
        onClose={close}
        title={`Start season ${next}?`}
      >
        <div className="grid gap-3 text-sm">
          <p>
            From now on new matches count for season {next}, and everybody
            starts again at a rating of 1000.
            {current &&
              ` Season ${current.number} ends here and keeps its results and champion in the Hall of Fame.`}
          </p>
          <div className="flex justify-end gap-2">
            <button className={secondary} onClick={close}>
              Cancel
            </button>
            <button
              className={primary}
              disabled={start.isPending}
              onClick={() => start.mutate()}
            >
              Start season {next}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog?.kind === "renumber"}
        onClose={close}
        title={target ? `Change the number of season ${target.number}` : ""}
      >
        {target && (
          <form
            className="grid gap-3 text-sm"
            onSubmit={e => {
              e.preventDefault();
              renumber.mutate({ id: target.id, number: Number(typed) });
            }}
          >
            <p>
              Its matches, ratings and achievements move with it. Use a number
              that no other season has, for example to close a gap after
              deleting a season.
            </p>
            <label className="grid gap-1">
              <span>New number</span>
              <input
                autoFocus
                inputMode="numeric"
                value={typed}
                onChange={e => setTyped(e.target.value.replace(/\D/g, ""))}
                aria-label="New season number"
                onFocus={e => e.target.select()}
                className="h-11 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={secondary} onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                className={primary}
                disabled={
                  renumber.isPending ||
                  !(Number(typed) >= 1) ||
                  Number(typed) === target.number
                }
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === "activate"}
        onClose={close}
        title={target ? `Make season ${target.number} current?` : ""}
      >
        {target && (
          <div className="grid gap-3 text-sm">
            <p>
              New matches will count for season {target.number} again.
              {current &&
                ` Season ${current.number} keeps its matches; you can make it current again later.`}
            </p>
            <div className="flex justify-end gap-2">
              <button className={secondary} onClick={close}>
                Cancel
              </button>
              <button
                className={primary}
                disabled={activate.isPending}
                onClick={() => activate.mutate({ id: target.id })}
              >
                Make current
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === "delete"}
        onClose={close}
        title={target ? `Delete season ${target.number}?` : ""}
      >
        {target && (
          <form
            className="grid gap-3 text-sm"
            onSubmit={e => {
              e.preventDefault();
              remove.mutate({
                id: target.id,
                confirm: target.matches > 0 ? Number(typed) : undefined,
              });
            }}
          >
            {target.matches === 0 ? (
              <p>Season {target.number} has no matches.</p>
            ) : (
              <>
                <p>
                  This deletes its <b>{target.matches}</b>{" "}
                  {target.matches === 1 ? "match" : "matches"} with their team
                  ratings and achievements, and the season disappears from the
                  Hall of Fame. Players and other seasons are not affected. This
                  can&apos;t be undone.
                </p>
                <label className="grid gap-1">
                  <span>
                    Type <b>{target.number}</b> to confirm
                  </span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={typed}
                    onChange={e => setTyped(e.target.value.replace(/\D/g, ""))}
                    aria-label="Season number"
                    className="h-11 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </label>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={secondary} onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                className={danger}
                disabled={
                  remove.isPending ||
                  (target.matches > 0 && typed !== String(target.number))
                }
              >
                Delete
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default Seasons;
