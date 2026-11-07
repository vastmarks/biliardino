import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "~/utils/toast";
import { trpc } from "~/utils/trpc";
import { Card, LoadingIndicator } from "~/components/Elements";
import { Input } from "~/components/Form";
import { useStore } from "~/utils/store";
import { matchAddValidation } from "~/utils/validation";
import { formatSize, MATCH_FORMATS, MatchFormat } from "~/utils/players";

type Slot = number | null;

const PlayerSelect = ({
  label,
  value,
  taken,
  players,
  onChange,
}: {
  label: string;
  value: Slot;
  /** players already picked in another slot */
  taken: number[];
  players: Array<{ id: number; name: string }>;
  onChange: (id: Slot) => void;
}) => (
  <div>
    <label className="text-sm block mb-1 text-gray-900 dark:text-gray-400">
      {label}
    </label>
    <select
      aria-label={label}
      className="bg-gray-50 w-full p-2 rounded-lg focus:outline-none dark:bg-gray-900"
      value={value ?? ""}
      onChange={e => onChange(e.target.value === "" ? null : +e.target.value)}
    >
      <option value="">Choose player…</option>
      {players.map(p => (
        <option key={p.id} value={p.id} disabled={taken.includes(p.id)}>
          {p.name}
        </option>
      ))}
    </select>
  </div>
);

export const MatchCreationForm = () => {
  const [format, setFormat] = useState<MatchFormat>("2v2");
  const [side1, setSide1] = useState<Slot[]>([null, null]);
  const [side2, setSide2] = useState<Slot[]>([null, null]);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [comment, setComment] = useState("");

  const selectedSeason = useStore(state => +state.season);
  const seasons = trpc.seasons.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const players = trpc.players.all.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const mutation = trpc.matches.add.useMutation({
    onSuccess: async () => {
      await utils.matches.invalidate();
      await utils.players.invalidate();
      toast("Match saved.", { type: "success" });
      // players stay selected (rematches are common), the result is cleared
      setScore1("");
      setScore2("");
      setComment("");
    },
    onError: err => {
      toast(`Error: ${err.message}`, { type: "error" });
    },
  });

  const size = formatSize(format);
  const picked1 = side1.slice(0, size);
  const picked2 = side2.slice(0, size);
  const taken = useMemo(
    () => [...picked1, ...picked2].filter((id): id is number => id !== null),
    [picked1, picked2],
  );

  const parsed = matchAddValidation.safeParse({
    format,
    players1: picked1.filter((id): id is number => id !== null),
    players2: picked2.filter((id): id is number => id !== null),
    score1,
    score2,
    comment,
  });

  if (seasons.isLoading || players.isLoading) {
    return (
      <div className="p-20 flex justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  const roster = players.data ?? [];
  const seasonIsCurrent =
    seasons.data?.find(s => s.current)?.number === selectedSeason;

  const setSlot = (
    side: Slot[],
    setSide: (s: Slot[]) => void,
    index: number,
    id: Slot,
  ) => {
    const next = [...side];
    next[index] = id;
    setSide(next);
  };

  const sideInputs = (
    teamLabel: string,
    side: Slot[],
    setSide: (s: Slot[]) => void,
  ) => (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: size }, (_, i) => (
        <PlayerSelect
          key={i}
          label={size === 1 ? teamLabel : `${teamLabel} · Player ${i + 1}`}
          value={side[i]}
          taken={taken.filter(id => id !== side[i])}
          players={roster}
          onChange={id => setSlot(side, setSide, i, id)}
        />
      ))}
    </div>
  );

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (parsed.success) {
          mutation.mutate(parsed.data);
        }
      }}
    >
      <Card>
        <div className="p-6">
          <div
            className="flex gap-2 mb-5"
            role="radiogroup"
            aria-label="Match format"
          >
            {MATCH_FORMATS.map(f => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={format === f}
                onClick={() => setFormat(f)}
                className={`px-4 py-1 rounded-lg font-semibold text-sm ${
                  format === f
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 opacity-70 hover:opacity-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {roster.length < size * 2 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              A {format} needs at least {size * 2} players. Add players on the{" "}
              <Link href="/players" className="text-blue-500 underline">
                Players page
              </Link>{" "}
              first ({roster.length} so far).
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5 grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  {sideInputs("Team 1", side1, setSide1)}
                </div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    placeholder="10"
                    label="Score"
                    value={score1}
                    onChange={e =>
                      setScore1((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
              </div>
              <div className="md:col-span-2 text-center self-center">
                <h3 className="font-bold text-3xl">vs</h3>
              </div>
              <div className="md:col-span-5 grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  {sideInputs("Team 2", side2, setSide2)}
                </div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    placeholder="7"
                    label="Score"
                    value={score2}
                    onChange={e =>
                      setScore2((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 flex justify-between border-t dark:border-gray-500">
          <input
            type="text"
            className="border-0 text-sm focus:outline-none bg-transparent"
            placeholder="Comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          {seasonIsCurrent ? (
            <button
              type="submit"
              className="px-6 py-1 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!parsed.success || mutation.isPending}
            >
              {mutation.isPending ? <LoadingIndicator /> : "Save"}
            </button>
          ) : (
            <span className="text-sm text-red-500">
              Season {selectedSeason} is over! Pick the current season above to
              enter matches.
            </span>
          )}
        </div>
      </Card>
    </form>
  );
};
