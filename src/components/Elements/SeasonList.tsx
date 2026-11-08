import { FunctionComponent } from "react";
import type { Season } from "~/generated/prisma/browser";
import { TimeDistance } from "~/components/Elements/TimeDistance";
import { trpc } from "~/utils/trpc";
import { toast } from "~/utils/toast";

export const SeasonList: FunctionComponent<{ seasons: Season[] }> = ({
  seasons,
}) => {
  const utils = trpc.useUtils();
  const activateMutation = trpc.seasons.activate.useMutation({
    onSuccess: () => utils.seasons.invalidate(),
  });
  const deleteMutation = trpc.seasons.delete.useMutation({
    onSuccess: () => {
      toast("Its gone. Forever.", {
        type: "success",
      });
      utils.seasons.invalidate();
    },
  });

  return (
    <>
      <table className="w-full dark:bg-gray-700">
        <thead className="text-left">
          <tr className="bg-gray-200 dark:bg-gray-600 text-sm">
            <th className="p-3">Name</th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {seasons.map((season, index) => (
            <tr
              key={season.id}
              className={`${
                index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800" : ""
              } ${!season.current ? "opacity-40" : ""}`}
            >
              <td className={`p-3`}>
                {season.number}
                {season.current && (
                  <span className="inline-flex items-center bg-green-50 rounded px-2 py-0.5 text-xs font-medium text-green-700 ml-3">
                    Active
                  </span>
                )}
                <div className="mt-0.5 text-xs opacity-50">
                  <TimeDistance date={season.createdAt} />
                </div>
              </td>
              <td className={`p-3 text-2xl`}>
                <div className="flex gap-3">
                  {!season.current && (
                    <>
                      <button
                        className="mx-3 text-red-500"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Sure you want to delete ${season.number}? Matches from this season will NOT be deleted.`,
                            )
                          ) {
                            deleteMutation.mutate({ id: season.id });
                          }
                        }}
                      >
                        <span aria-hidden>✕</span>
                      </button>
                      <button
                        className="mx-3 text-green-500"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Sure you want to set ${season.number} as current?`,
                            )
                          ) {
                            activateMutation.mutate({ id: season.id });
                          }
                        }}
                      >
                        <span aria-hidden>▶</span>
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
