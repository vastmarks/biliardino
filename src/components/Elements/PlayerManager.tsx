import { FormEvent, useState } from "react";
import Link from "next/link";
import { Modal } from "~/components/Elements/Modal";
import { toast } from "~/utils/toast";
import { trpc } from "~/utils/trpc";
import { useIsAdmin } from "~/utils/useIsAdmin";
import { MAX_PLAYER_NAME_LENGTH } from "~/utils/players";

type Player = {
  id: number;
  name: string;
  key: string;
  archived: boolean;
  matches: number;
};
type Dialog =
  | { kind: "rename"; player: Player }
  | { kind: "delete"; player: Player; step: 1 | 2 }
  | null;

const input =
  "w-full h-11 px-3 text-base rounded-lg bg-gray-100 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none";
const secondary = "h-11 px-4 rounded-lg bg-gray-200 dark:bg-gray-700";
const danger =
  "h-11 px-4 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-40";

/**
 * Rename, archive and delete players.
 * - rename: fixes a typo everywhere (the team names containing the player are renamed too)
 * - archive: hides someone who left from the match entry, history stays (the safe choice)
 * - delete: removes the player; if they played, also all their matches, so it asks twice
 */
export const PlayerManager = ({ players }: { players: Player[] }) => {
  const isAdmin = useIsAdmin();
  const utils = trpc.useUtils();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const close = () => setDialog(null);

  const refresh = () =>
    Promise.all([
      utils.players.invalidate(),
      utils.dashboard.invalidate(),
      utils.matches.invalidate(),
      utils.teams.invalidate(),
    ]);
  const onError = (err: { message: string }) =>
    toast(err.message, { type: "error" });

  const rename = trpc.players.rename.useMutation({
    onSuccess: async () => {
      await refresh();
      toast("Player renamed", { type: "success" });
      close();
    },
    onError,
  });
  const archive = trpc.players.archive.useMutation({
    onSuccess: async p => {
      await refresh();
      toast(p.archived ? `${p.name} archived` : `${p.name} is back`, {
        type: "success",
      });
      close();
    },
    onError,
  });
  const remove = trpc.players.delete.useMutation({
    onSuccess: async r => {
      await refresh();
      toast(
        r.deletedMatches > 0
          ? `Player and ${r.deletedMatches} matches deleted`
          : "Player deleted",
        { type: "success" },
      );
      close();
    },
    onError,
  });

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    if (dialog?.kind === "rename") {
      rename.mutate({ id: dialog.player.id, name });
    }
  };

  const target = dialog?.player;
  const played = target?.matches ?? 0;

  return (
    <section className="mt-4">
      <h2 className="font-bold mb-2 px-1">Manage players</h2>
      <ul className="divide-y dark:divide-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
        {players.map(p => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
          >
            <span className="flex-1 min-w-[8rem]">
              <Link
                href={`/players/${encodeURIComponent(p.key)}`}
                className={`font-bold hover:underline ${p.archived ? "opacity-50" : ""}`}
              >
                {p.name}
              </Link>{" "}
              <span className="text-xs text-gray-500">
                {p.matches} {p.matches === 1 ? "match" : "matches"}
                {p.archived && " · archived"}
              </span>
            </span>
            <button
              className="text-blue-500 dark:text-blue-300 h-9 px-1"
              onClick={() => {
                setName(p.name);
                setDialog({ kind: "rename", player: p });
              }}
            >
              Rename
            </button>
            <button
              className="text-blue-500 dark:text-blue-300 h-9 px-1"
              disabled={archive.isPending}
              onClick={() =>
                archive.mutate({ id: p.id, archived: !p.archived })
              }
            >
              {p.archived ? "Restore" : "Archive"}
            </button>
            {(p.matches === 0 || isAdmin) && (
              <button
                className="text-red-500 h-9 px-1"
                onClick={() => {
                  setConfirmName("");
                  setDialog({ kind: "delete", player: p, step: 1 });
                }}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-2 px-1">
        <b>Archive</b> hides someone who left from the match entry and the
        leaderboards, their history stays. Players who have played can only be
        deleted by the admin (
        <Link href="/admin" className="underline">
          log in
        </Link>
        ).
      </p>

      <Modal
        open={dialog?.kind === "rename"}
        onClose={close}
        title="Rename player"
      >
        <form onSubmit={submitRename} className="grid gap-3">
          <input
            autoFocus
            value={name}
            maxLength={MAX_PLAYER_NAME_LENGTH}
            onChange={e => setName(e.target.value)}
            aria-label="New name"
            className={input}
          />
          <p className="text-xs text-gray-500">
            The name changes everywhere, including past matches and pairs.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondary} onClick={close}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={name.trim() === "" || rename.isPending}
              className="h-11 px-5 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "delete"}
        onClose={close}
        title={target ? `Delete ${target.name}?` : "Delete player"}
      >
        {target && played === 0 && (
          <div className="grid gap-3">
            <p className="text-sm">
              {target.name} hasn&apos;t played any match, nothing else is
              affected.
            </p>
            <div className="flex justify-end gap-2">
              <button className={secondary} onClick={close}>
                Cancel
              </button>
              <button
                className={danger}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ id: target.id, confirmName: "" })
                }
              >
                Delete
              </button>
            </div>
          </div>
        )}
        {target &&
          played > 0 &&
          dialog?.kind === "delete" &&
          dialog.step === 1 && (
            <div className="grid gap-3">
              <p className="text-sm">
                <b>{target.name}</b> has played <b>{played}</b>{" "}
                {played === 1 ? "match" : "matches"}. Deleting the player
                deletes all of them and changes the ratings of everybody they
                played with. This can&apos;t be undone.
              </p>
              <p className="text-sm">
                If {target.name} just doesn&apos;t play anymore, <b>archive</b>{" "}
                is the better choice: it hides them from the match entry and
                keeps all results.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button className={secondary} onClick={close}>
                  Cancel
                </button>
                {!target.archived && (
                  <button
                    className="h-11 px-4 rounded-lg bg-blue-500 text-white font-semibold"
                    onClick={() =>
                      archive.mutate({ id: target.id, archived: true })
                    }
                  >
                    Archive instead
                  </button>
                )}
                <button
                  className="h-11 px-4 rounded-lg border border-red-400 text-red-500"
                  onClick={() =>
                    setDialog({ kind: "delete", player: target, step: 2 })
                  }
                >
                  Continue deleting…
                </button>
              </div>
            </div>
          )}
        {target &&
          played > 0 &&
          dialog?.kind === "delete" &&
          dialog.step === 2 && (
            <div className="grid gap-3">
              <p className="text-sm">
                Last step: type <b>{target.name}</b> to delete the player and{" "}
                {played} {played === 1 ? "match" : "matches"} for good.
              </p>
              <input
                autoFocus
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                aria-label="Type the player's name to confirm"
                placeholder={target.name}
                className={input}
              />
              <div className="flex justify-end gap-2">
                <button className={secondary} onClick={close}>
                  Cancel
                </button>
                <button
                  className={danger}
                  disabled={
                    confirmName.trim().toLowerCase() !==
                      target.name.toLowerCase() || remove.isPending
                  }
                  onClick={() => remove.mutate({ id: target.id, confirmName })}
                >
                  Delete player and matches
                </button>
              </div>
            </div>
          )}
      </Modal>
    </section>
  );
};
