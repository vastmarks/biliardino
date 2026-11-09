import { Fragment, FunctionComponent } from "react";
import { Achievement, achievements, Scope } from "~/utils/achievements";
import { TimeDistance } from "~/components/Elements/TimeDistance";

export interface EarnedItem {
  achievement: string;
  createdAt: Date | string;
}

const AchievementCard: FunctionComponent<{
  achievement: Achievement;
  earned: Array<{ name: string; date: Date | string; cssClasses: string }>;
  display: "single" | "versus";
}> = ({ achievement, earned, display }) => {
  let bgColor;
  switch (true) {
    case achievement.points >= 50:
      bgColor = "bg-linear-to-b from-yellow-500 to-amber-600";
      break;
    case achievement.points >= 25:
      bgColor = "bg-linear-to-b from-gray-400 to-gray-500";
      break;
    default:
      bgColor = "bg-linear-to-b from-amber-700 to-amber-800";
  }

  return (
    <div className="w-full border rounded-sm flex items-center dark:border-gray-500">
      <div className={`p-3 text-lg h-full text-white flex items-center`}>
        <div>
          <span
            className={`rounded-full font-semibold p-2 ${bgColor} shadow-xl`}
          >
            {achievement.points}
          </span>
        </div>
      </div>
      <div className={`p-2 w-full`}>
        <h2 className="font-bold">{achievement.title}</h2>
        <div>{achievement.description}</div>
        <small className="text-gray-500 flex gap-1">
          {display === "single" ? (
            <>
              ✅ <TimeDistance date={new Date(earned[0].date)} />
            </>
          ) : (
            <>
              {earned.map(e => (
                <Fragment key={`${e.name}-${e.date}`}>
                  <span
                    className={`p-1 text-gray-800 rounded-lg bg-gray-200 mr-1 ${e.cssClasses}`}
                  >
                    {e.name}
                  </span>
                </Fragment>
              ))}
            </>
          )}
        </small>
      </div>
    </div>
  );
};

/**
 * The achievements of a player or a pair (`scope`), earned once and kept for good whatever
 * season is selected. With `versus`, a second one is compared on the same cards.
 */
export const AchievementList: FunctionComponent<{
  scope: Scope;
  name: string;
  earned: EarnedItem[];
  versus?: { name: string; earned: EarnedItem[] };
}> = ({ scope, name, earned, versus }) => {
  const mine = achievements.filter(
    a => a.scope === scope && earned.some(e => e.achievement === a.id),
  );
  const theirs = versus
    ? achievements.filter(
        a =>
          a.scope === scope && versus.earned.some(e => e.achievement === a.id),
      )
    : [];
  const unique = [...new Set([...mine, ...theirs])];

  if (unique.length === 0) {
    return (
      <p className="text-sm italic opacity-60 text-center">
        No achievements yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {unique.map(achievement => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          earned={[
            ...mine
              .filter(a => a.id === achievement.id)
              .map(() => ({
                name,
                date: earned.find(e => e.achievement === achievement.id)!
                  .createdAt,
                cssClasses: "bg-lime-600 text-white",
              })),
            ...theirs
              .filter(a => a.id === achievement.id)
              .map(() => ({
                name: versus!.name,
                date: versus!.earned.find(
                  e => e.achievement === achievement.id,
                )!.createdAt,
                cssClasses: "bg-cyan-600 text-white",
              })),
          ]}
          display={versus ? "versus" : "single"}
        />
      ))}
    </div>
  );
};
