import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "~/utils/toast";
import { trpc } from "~/utils/trpc";
import { formatSize, MATCH_FORMATS, MatchFormat } from "~/utils/players";

type Roster = Array<{ id: number; key: string; name: string }>;
const FORMAT_KEY = "hilde:format";

const sideColor = [
  "border-sky-500 bg-sky-50 dark:bg-sky-950",
  "border-amber-500 bg-amber-50 dark:bg-amber-950",
];

/**
 * Match entry, built for use right after a game on a phone: the format toggle, big tap targets
 * (player chips instead of native selects), numeric keypad for the scores, and the picked
 * players stay selected after saving because rematches are the norm.
 */
export const MatchEntry = ({
  roster,
  season,
  isCurrentSeason,
}: {
  roster: Roster;
  season: number;
  isCurrentSeason: boolean;
}) => {
  const [format, setFormat] = useState<MatchFormat>("2v2");
  // flat list: side 1 slots followed by side 2 slots (always 2 + 2 long, only `size` shown)
  const [slots, setSlots] = useState<Array<number | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [comment, setComment] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORMAT_KEY);
      if (saved === "1v1" || saved === "2v2") setFormat(saved);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const utils = trpc.useUtils();
  const mutation = trpc.matches.add.useMutation({
    onSuccess: async (_, vars) => {
      await Promise.all([
        utils.dashboard.invalidate(),
        utils.matches.invalidate(),
        utils.players.invalidate(),
      ]);
      setStatus(`Saved ${vars.score1} : ${vars.score2}`);
      toast("Match saved", { type: "success" });
      setScore1("");
      setScore2("");
      setComment("");
      setShowNote(false);
    },
    onError: err => {
      setStatus(null);
      toast(err.message, { type: "error" });
    },
  });

  const size = formatSize(format);
  // index of the slot that takes the next tapped player
  const visible = (i: number) => (i < 2 ? i < size : i - 2 < size);
  const indexes = [0, 1, 2, 3].filter(visible);
  const firstEmpty = indexes.find(i => slots[i] === null);
  const active = cursor !== null && visible(cursor) ? cursor : firstEmpty;
  const byId = new Map(roster.map(p => [p.id, p]));
  const placed = (id: number) => indexes.find(i => slots[i] === id);

  const chooseFormat = (f: MatchFormat) => {
    setFormat(f);
    setCursor(null);
    setStatus(null);
    try {
      localStorage.setItem(FORMAT_KEY, f);
    } catch {
      /* ignore */
    }
  };

  const tapPlayer = (id: number) => {
    setStatus(null);
    const at = placed(id);
    const next = [...slots];
    if (at !== undefined) {
      next[at] = null; // tapping a picked player removes them
      setSlots(next);
      setCursor(at);
      return;
    }
    if (active === undefined) return; // every slot is filled
    next[active] = id;
    setSlots(next);
    setCursor(null);
  };

  const swap = () => {
    setSlots([slots[2], slots[3], slots[0], slots[1]]);
    setScore1(score2);
    setScore2(score1);
    setCursor(null);
  };

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 2);
  const picked1 = slots.slice(0, size);
  const picked2 = slots.slice(2, 2 + size);
  const complete = [...picked1, ...picked2].every(id => id !== null);
  const ready = complete && score1 !== "" && score2 !== "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready || mutation.isPending) return;
    mutation.mutate({
      format,
      players1: picked1 as number[],
      players2: picked2 as number[],
      score1,
      score2,
      comment,
    });
  };

  if (roster.length < size * 2) {
    return (
      <section className="rounded-lg bg-white dark:bg-gray-800 shadow p-5 text-center text-sm text-gray-500">
        A {format} needs at least {size * 2} players. Add players on the{" "}
        <Link href="/players" className="text-blue-500 underline">
          Players page
        </Link>{" "}
        first ({roster.length} so far).
      </section>
    );
  }

  const slotButton = (i: number) => {
    const p = slots[i] !== null ? byId.get(slots[i]!) : undefined;
    const side = i < 2 ? 0 : 1;
    const isActive = active === i;
    return (
      <button
        key={i}
        type="button"
        onClick={() => {
          setCursor(i);
          setStatus(null);
        }}
        aria-label={`${side === 0 ? "Team 1" : "Team 2"} player ${(i % 2) + 1}${
          p ? `: ${p.name}` : ""
        }`}
        className={`min-h-11 w-full px-3 rounded-lg border-2 text-base text-left truncate ${
          p
            ? sideColor[side]
            : "border-dashed border-gray-300 dark:border-gray-600 text-gray-400"
        } ${isActive ? "ring-2 ring-blue-500" : ""}`}
      >
        {p ? p.name : isActive ? "Tap a player…" : "Player"}
      </button>
    );
  };

  const scoreInput = (
    value: string,
    set: (v: string) => void,
    label: string,
  ) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      placeholder="0"
      value={value}
      onChange={e => {
        set(digits(e.target.value));
        setStatus(null);
      }}
      onFocus={e => e.currentTarget.select()}
      className="w-16 h-14 text-center text-3xl font-bold tabular-nums rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    />
  );

  return (
    <form
      onSubmit={submit}
      className="rounded-lg bg-white dark:bg-gray-800 shadow p-3 sm:p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5"
          role="radiogroup"
          aria-label="Match format"
        >
          {MATCH_FORMATS.map(f => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => chooseFormat(f)}
              className={`px-4 h-9 rounded-md text-sm font-semibold ${
                format === f ? "bg-blue-500 text-white" : "text-gray-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={swap}
          className="h-9 px-3 text-sm text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Swap sides"
        >
          ⇄ Swap
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-2 items-start">
        <div className="grid gap-2">
          {indexes.filter(i => i < 2).map(slotButton)}
        </div>
        <div className="self-center text-xs font-bold text-gray-400">VS</div>
        <div className="grid gap-2">
          {indexes.filter(i => i >= 2).map(slotButton)}
        </div>
      </div>

      <div className="my-3 flex items-center justify-center gap-3">
        {scoreInput(score1, setScore1, "Team 1 score")}
        <span className="text-2xl text-gray-400">:</span>
        {scoreInput(score2, setScore2, "Team 2 score")}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Players">
        {roster.map(p => {
          const at = placed(p.id);
          const side = at === undefined ? null : at < 2 ? 0 : 1;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => tapPlayer(p.id)}
              aria-pressed={at !== undefined}
              className={`min-h-10 px-3 rounded-full text-sm border ${
                side === null
                  ? "border-gray-300 dark:border-gray-600"
                  : `${sideColor[side]} border-2 font-semibold`
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {showNote && (
        <input
          type="text"
          maxLength={500}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className="mt-3 w-full h-11 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      )}

      <div className="mt-3 flex items-center gap-3">
        {!showNote && (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm text-gray-500 h-11 px-2"
          >
            + Note
          </button>
        )}
        <div className="flex-1 text-sm text-center" role="status">
          {status && <span className="text-green-600">{status} ✓</span>}
          {!isCurrentSeason && (
            <span className="text-red-500">
              Season {season} is over - switch to the current season to add
              matches.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!ready || mutation.isPending || !isCurrentSeason}
          className="h-11 px-6 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-40"
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
};
