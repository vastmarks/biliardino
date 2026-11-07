import { useState } from "react";
import { AdminLayout } from "~/components/Layout/AdminLayout";
import { SeasonList } from "~/components/Elements";
import { trpc } from "~/utils/trpc";
import { toast } from "~/utils/toast";

const Seasons = () => {
  const seasons = trpc.seasons.list.useQuery();
  const utils = trpc.useUtils();
  const [number, setNumber] = useState("");
  const valid = /^\d+$/.test(number);
  const mutation = trpc.seasons.add.useMutation({
    onSuccess: () => {
      toast("Season added. Don't forget to activate it!", { type: "success" });
      utils.seasons.invalidate();
      setNumber("");
    },
    onError: err => toast(`Error: ${err.message}`, { type: "error" }),
  });

  return (
    <AdminLayout>
      <h1 className="text-lg font-bold mb-2">Seasons</h1>
      <SeasonList seasons={seasons.data || []} />
      <form
        onSubmit={e => {
          e.preventDefault();
          if (valid) mutation.mutate({ number: +number });
        }}
      >
        <div className="flex mt-4 dark:bg-gray-700 bg-gray-200 p-3 gap-3 items-end rounded-lg">
          <div className="w-full">
            <label
              htmlFor="new-season"
              className="text-sm block mb-1 text-gray-900 dark:text-gray-400"
            >
              New season
            </label>
            <input
              id="new-season"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Numbers only"
              value={number}
              onChange={e => setNumber(e.target.value)}
              className="bg-gray-50 w-full p-2 text-base rounded-lg focus:outline-none dark:bg-gray-900"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!valid || mutation.isPending}
          >
            Add
          </button>
        </div>
      </form>
    </AdminLayout>
  );
};

export default Seasons;
