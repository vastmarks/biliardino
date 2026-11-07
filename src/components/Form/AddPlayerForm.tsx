import { useState } from "react";
import { toast } from "~/utils/toast";
import { trpc } from "~/utils/trpc";
import { validatePlayerName } from "~/utils/players";

export const AddPlayerForm = () => {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const mutation = trpc.players.create.useMutation({
    onSuccess: async player => {
      await utils.players.invalidate();
      toast(`${player.name} added.`, { type: "success" });
      setName("");
    },
    onError: err => toast(`Error: ${err.message}`, { type: "error" }),
  });
  const problem = name.trim() === "" ? null : validatePlayerName(name);

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={e => {
        e.preventDefault();
        if (name.trim() !== "" && !problem) {
          mutation.mutate({ name });
        }
      }}
    >
      <label htmlFor="new-player" className="text-sm font-semibold">
        New player
      </label>
      <input
        id="new-player"
        type="text"
        value={name}
        maxLength={30}
        placeholder="Name"
        autoComplete="off"
        onChange={e => setName(e.target.value)}
        className="bg-gray-50 p-2 rounded-lg focus:outline-none dark:bg-gray-900"
      />
      <button
        type="submit"
        className="px-4 py-1 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={name.trim() === "" || !!problem || mutation.isPending}
      >
        Add
      </button>
      {problem && <span className="text-sm text-red-500">{problem}</span>}
    </form>
  );
};
