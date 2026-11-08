import {
  FormEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { toast } from "~/utils/toast";
import { trpc } from "~/utils/trpc";
import { formatSize, MATCH_FORMATS, MatchFormat } from "~/utils/players";
import { PlayerSearch } from "~/components/Dashboard/PlayerSearch";

type Player = { id: number; key: string; name: string; archived: boolean };
const FORMAT_KEY = "biliardino:format";

/**
 * The last used format (1v1/2v2), remembered in the browser. Read with useSyncExternalStore,
 * React's way to use a browser value: the server renders 2v2, the browser then switches to the
 * stored one without a mismatch. https://react.dev/reference/react/useSyncExternalStore
 */
const formatStore = (() => {
  let current: MatchFormat | null = null; // also works when storage is blocked
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(l => l());
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = () => {
        current = null;
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    get(): MatchFormat {
      if (current) return current;
      try {
        return localStorage.getItem(FORMAT_KEY) === "1v1" ? "1v1" : "2v2";
      } catch {
        return "2v2";
      }
    },
    server: (): MatchFormat => "2v2",
    set(f: MatchFormat) {
      current = f;
      try {
        localStorage.setItem(FORMAT_KEY, f);
      } catch {
        /* storage unavailable: remembered until the page is closed */
      }
      notify();
    },
  };
})();

const sideColor = [
  "border-sky-500 bg-sky-50 dark:bg-sky-950",
  "border-amber-500 bg-amber-50 dark:bg-amber-950",
];

/**
 * Match entry, built for use right after a game on a phone:
 * - the format toggle (remembered), then the players of both sides: type a name (or tap one
 *   of the recent players), the picker narrows the list as you type and Enter takes it
 * - big numeric score fields, an optional note
 * - the players stay selected after saving, because rematches are the norm
 */
export const MatchEntry = ({
  roster,
  season,
  isCurrentSeason,
}: {
  /** everybody, most recently active first */
  roster: Player[];
  season: number;
  isCurrentSeason: boolean;
}) => {
  const format = useSyncExternalStore(
    formatStore.subscribe,
    formatStore.get,
    formatStore.server,
  );
  // flat list: side 1 slots followed by side 2 slots (only `size` per side are shown)
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
  // players created from the picker, until the refreshed roster contains them
  const [created, setCreated] = useState<Player[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const score1Ref = useRef<HTMLInputElement>(null);

  const everybody = useMemo(
    () => [...roster, ...created.filter(c => !roster.some(r => r.id === c.id))],
    [roster, created],
  );
  const byId = useMemo(
    () => new Map(everybody.map(p => [p.id, p])),
    [everybody],
  );

  const utils = trpc.useUtils();
  const createPlayer = trpc.players.create.useMutation({
    onError: err => toast(err.message, { type: "error" }),
  });
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
      closeNote();
    },
    onError: err => {
      setStatus(null);
      toast(err.message, { type: "error" });
    },
  });

  const size = formatSize(format);
  const visible = (i: number) => (i < 2 ? i < size : i - 2 < size);
  const indexes = [0, 1, 2, 3].filter(visible);
  const firstEmpty = indexes.find(i => slots[i] === null);
  // the slot the next picked player goes to
  const active = cursor !== null && visible(cursor) ? cursor : firstEmpty;

  const pickedIds = new Set(
    indexes.map(i => slots[i]).filter(id => id !== null),
  );
  const available = everybody.filter(p => !p.archived && !pickedIds.has(p.id));

  const chooseFormat = (f: MatchFormat) => {
    formatStore.set(f);
    setCursor(null);
    setStatus(null);
  };

  const place = (id: number) => {
    setStatus(null);
    if (active === undefined) return; // every slot is filled
    const next = [...slots];
    next[active] = id;
    setSlots(next);
    setCursor(null);
    // keep typing for the next player, or move on to the score once everybody is in
    const stillEmpty = indexes.some(i => next[i] === null);
    if (stillEmpty) {
      searchRef.current?.focus();
    } else {
      searchRef.current?.blur();
      score1Ref.current?.focus();
    }
  };

  const addAndPlace = async (name: string) => {
    try {
      const player = await createPlayer.mutateAsync({ name });
      setCreated(list => [...list, { ...player, archived: false }]);
      void utils.dashboard.invalidate();
      void utils.players.invalidate();
      place(player.id);
    } catch {
      /* the error toast was shown by onError */
    }
  };

  const tapSlot = (i: number) => {
    setStatus(null);
    if (slots[i] !== null) {
      // tapping a picked player takes them out again
      const next = [...slots];
      next[i] = null;
      setSlots(next);
    }
    setCursor(i);
    searchRef.current?.focus();
  };

  const swap = () => {
    setSlots([slots[2], slots[3], slots[0], slots[1]]);
    setScore1(score2);
    setScore2(score1);
    setCursor(null);
  };

  const closeNote = () => {
    setShowNote(false);
    setComment("");
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
      comment: comment.trim(),
    });
  };

  const needed = size * 2;
  if (
    everybody.filter(p => !p.archived).length < needed &&
    created.length === 0
  ) {
    return (
      <section className="rounded-lg bg-white dark:bg-gray-800 shadow-sm p-5 text-center text-sm text-gray-500">
        A {format} needs at least {needed} players. Add players on the{" "}
        <Link
          href="/players"
          className="text-blue-500 dark:text-blue-300 underline"
        >
          Players page
        </Link>{" "}
        first ({everybody.filter(p => !p.archived).length} so far).
      </section>
    );
  }

  const slotButton = (i: number) => {
    const p = slots[i] !== null ? byId.get(slots[i]!) : undefined;
    const side = i < 2 ? 0 : 1;
    return (
      <button
        key={i}
        type="button"
        onClick={() => tapSlot(i)}
        aria-label={`${side === 0 ? "Team 1" : "Team 2"} player ${(i % 2) + 1}${
          p ? `: ${p.name} (tap to remove)` : ""
        }`}
        // one border per state, never two: dashed = empty, solid celeste = being picked,
        // solid team colour = filled
        className={`min-h-11 w-full px-3 rounded-lg border-2 text-base text-left truncate transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          p
            ? sideColor[side]
            : active === i
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200"
              : "border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-400"
        }`}
      >
        {p ? p.name : active === i ? "Pick a player…" : "Player"}
      </button>
    );
  };

  const scoreInput = (
    value: string,
    set: (v: string) => void,
    label: string,
    ref?: React.Ref<HTMLInputElement>,
  ) => (
    <input
      ref={ref}
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
      className="w-16 h-14 text-center text-3xl font-bold tabular-nums rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
    />
  );

  return (
    <form
      onSubmit={submit}
      className="rounded-lg bg-white dark:bg-gray-800 shadow-sm p-3 sm:p-4"
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

      <div className="mt-3">
        <PlayerSearch
          players={available}
          existingNames={everybody.map(p => p.name)}
          inputRef={searchRef}
          disabled={active === undefined || createPlayer.isPending}
          placeholder={
            active === undefined
              ? "All players picked"
              : `Type a name for ${active < 2 ? "team 1" : "team 2"}…`
          }
          onPick={p => place(p.id)}
          onCreate={name => void addAndPlace(name)}
        />
      </div>

      <div className="my-3 flex items-center justify-center gap-3">
        {scoreInput(score1, setScore1, "Team 1 score", score1Ref)}
        <span className="text-2xl text-gray-400">:</span>
        {scoreInput(score2, setScore2, "Team 2 score")}
      </div>

      {showNote && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            maxLength={500}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
            autoFocus
            className="flex-1 h-11 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={closeNote}
            aria-label="Remove note"
            className="h-11 w-11 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
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
          {status && <span className="text-green-500">{status} ✓</span>}
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
