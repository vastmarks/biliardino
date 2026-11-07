import { KeyboardEvent, RefObject, useId, useMemo, useState } from "react";
import { validatePlayerName } from "~/utils/players";

export interface PickablePlayer {
  id: number;
  key: string;
  name: string;
}

/** "Zoë" matches "zoe": compare without accents and case. */
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const MAX_SUGGESTIONS = 8;

/**
 * Players matching what was typed: names starting with it first, then names containing it.
 * Pure function, so it can be tested.
 */
export function searchPlayers<T extends { name: string }>(
  players: T[],
  query: string,
  limit = MAX_SUGGESTIONS,
): T[] {
  const q = fold(query.trim());
  if (q === "") {
    return players.slice(0, limit);
  }
  const starts: T[] = [];
  const contains: T[] = [];
  for (const p of players) {
    const n = fold(p.name);
    if (n.startsWith(q)) starts.push(p);
    else if (n.includes(q)) contains.push(p);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * Type-ahead player picker. Scales to any number of players: with nothing typed it offers
 * the most recently active ones, typing narrows the list, Enter takes the first/highlighted
 * suggestion. A name that doesn't exist yet can be added right here.
 *
 * `players` must already be in the order to offer them (recent first) and must not contain
 * players who are already picked or archived.
 */
export const PlayerSearch = ({
  players,
  existingNames,
  inputRef,
  disabled,
  placeholder,
  onPick,
  onCreate,
}: {
  players: PickablePlayer[];
  /** names of ALL players, to know whether the typed name is new */
  existingNames: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  placeholder: string;
  onPick: (player: PickablePlayer) => void;
  onCreate: (name: string) => void;
}) => {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(
    () => searchPlayers(players, query),
    [players, query],
  );
  const typed = query.trim();
  const canCreate =
    typed !== "" &&
    validatePlayerName(typed) === null &&
    !existingNames.some(n => fold(n) === fold(typed));

  // the options: matching players, then (maybe) "add new player"
  const optionCount = matches.length + (canCreate ? 1 : 0);
  const active = Math.min(highlight, Math.max(optionCount - 1, 0));

  const choose = (index: number) => {
    if (index < matches.length) {
      onPick(matches[index]);
    } else if (canCreate) {
      onCreate(typed.replace(/\s+/g, " "));
    } else {
      return;
    }
    setQuery("");
    setHighlight(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((active + 1) % Math.max(optionCount, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((active - 1 + optionCount) % Math.max(optionCount, 1));
    } else if (e.key === "Enter") {
      e.preventDefault(); // Enter picks, it must not submit the match
      choose(active);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  const option = (selected: boolean) =>
    `min-h-10 px-3 rounded-full text-sm border text-left ${
      selected
        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 font-semibold"
        : "border-gray-300 dark:border-gray-600"
    }`;

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={optionCount > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          optionCount > 0 ? `${listId}-${active}` : undefined
        }
        aria-label="Find a player"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        enterKeyHint="go"
        autoComplete="off"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        maxLength={30}
        onChange={e => {
          setQuery(e.target.value);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        className="w-full h-12 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40"
      />
      <div
        id={listId}
        role="listbox"
        aria-label="Players"
        className="mt-2 flex flex-wrap gap-1.5"
      >
        {matches.map((p, i) => (
          <button
            key={p.id}
            id={`${listId}-${i}`}
            type="button"
            role="option"
            aria-selected={i === active}
            disabled={disabled}
            // keep the keyboard open: don't let the button steal focus from the input
            onMouseDown={e => e.preventDefault()}
            onClick={() => choose(i)}
            className={option(i === active && typed !== "")}
          >
            {p.name}
          </button>
        ))}
        {canCreate && (
          <button
            id={`${listId}-${matches.length}`}
            type="button"
            role="option"
            aria-selected={active === matches.length}
            disabled={disabled}
            onMouseDown={e => e.preventDefault()}
            onClick={() => choose(matches.length)}
            className={`${option(active === matches.length)} text-blue-600`}
          >
            + Add “{typed}” as new player
          </button>
        )}
        {optionCount === 0 && (
          <span className="text-sm text-gray-500 px-1">
            {typed === ""
              ? "Everybody is picked."
              : "No player with that name."}
          </span>
        )}
      </div>
      {typed === "" && players.length > MAX_SUGGESTIONS && (
        <p className="mt-1 text-xs text-gray-500">
          Most recent players. Type to find anyone else.
        </p>
      )}
    </div>
  );
};
