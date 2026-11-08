import { ReactNode } from "react";
import Link from "next/link";
import { PageTitle } from "~/components/Elements";
import { achievements } from "~/utils/achievements";
import { calculateRating, defaultRating, getExpectedRating } from "~/utils/elo";
import { PROVISIONAL_MATCHES } from "~/utils/playerStats";
import {
  ACTIVE_MIN_MATCHES,
  FORM_LENGTH,
  HOT_STREAK_MIN,
  PAIR_MIN_MATCHES,
  UPSET_MIN_GAP,
} from "~/utils/dashboard";
import { MOST_WINS_MIN_MATCHES } from "~/utils/hallOfFame";
import { EDIT_WINDOW_HOURS } from "~/utils/editRules";

const SECTIONS = [
  { id: "start", label: "Getting started" },
  { id: "home", label: "Home" },
  { id: "matches", label: "Matches" },
  { id: "players", label: "Players" },
  { id: "teams", label: "Teams" },
  { id: "hall-of-fame", label: "Hall of Fame" },
  { id: "rating", label: "How the rating works" },
  { id: "seasons", label: "Seasons" },
  { id: "achievements", label: "Achievements" },
  { id: "mistakes", label: "Fixing mistakes" },
];

const Section = ({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className="scroll-mt-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm p-4 sm:p-5"
  >
    <h2 id={`${id}-title`} className="text-xl font-bold">
      {title}
    </h2>
    {intro && <p className="mt-1 text-gray-500 dark:text-gray-400">{intro}</p>}
    <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
  </section>
);

/** A term and what it means, for the lists of columns and tiles. */
const Terms = ({ items }: { items: Array<[ReactNode, ReactNode]> }) => (
  <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
    {items.map(([term, text], i) => (
      <div key={i} className="contents">
        <dt className="font-semibold">{term}</dt>
        <dd className="text-gray-600 dark:text-gray-300 mb-1 sm:mb-0">
          {text}
        </dd>
      </div>
    ))}
  </dl>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="font-semibold pt-2">{children}</h3>
);

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The worked example, computed with the app's own formula so the numbers are always right. */
function example() {
  const anna = 1000;
  const marco = 1100;
  const expected = getExpectedRating(anna, marco);
  return {
    anna,
    marco,
    chance: Math.round(expected * 100),
    annaWins: round1(calculateRating(expected, 1, anna) - anna),
    marcoWins: round1(calculateRating(1 - expected, 1, marco) - marco),
  };
}

/**
 * Help for players: what every page shows, how the rating works, seasons, achievements and
 * how to fix a wrong entry. Numbers (thresholds, the rating example, the achievement list)
 * come from the code, so the page can't drift from what the app does.
 */
const Help = () => {
  const ex = example();
  const shown = achievements.filter(a => !a.retired);
  return (
    <>
      <PageTitle title="Help" />
      <div className="my-4">
        <h1 className="text-2xl font-bold">How biliardino works</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Everything you see in the app, explained for players.
        </p>
      </div>

      <nav
        aria-label="Help topics"
        className="flex flex-wrap gap-2 mb-4 text-sm"
      >
        {SECTIONS.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 hover:border-blue-500"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        <Section
          id="start"
          title="Getting started"
          intro="biliardino keeps the score of the office foosball table: who played, who won, and how good everyone is."
        >
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Make sure everybody is on the <b>Players</b> page (you can also
              add a new name right while entering a match).
            </li>
            <li>
              After a game, open <b>Home</b>, choose 1v1 or 2v2, pick the
              players, type the score and press <b>Save</b>.
            </li>
            <li>
              That&apos;s all: ratings, leaderboards, records and achievements
              update by themselves.
            </li>
          </ol>
          <p>
            <b>The philosophy:</b> entering a result should take ten seconds on
            a phone, and everything else is worked out from the results. Nobody
            has to keep tables or remember who won what. Every name you see is a
            link to that player&apos;s page.
          </p>
        </Section>

        <Section
          id="home"
          title="Home"
          intro="What's happening now: enter a result, then see this season's standings at a glance."
        >
          <H3>Match entry</H3>
          <p>
            Pick <b>1v1</b> or <b>2v2</b> (it remembers your last choice), tap a
            slot and type or tap a name: people who played recently come first.
            The players stay selected after saving, ready for the rematch.{" "}
            <b>⇄ Swap</b> switches the two sides; <b>+ Note</b> adds a comment
            (&quot;Friday cup final&quot;).
          </p>
          <H3>Leaderboard</H3>
          <p>
            The player ranking, by individual rating (see{" "}
            <a href="#rating" className="text-blue-500 dark:text-blue-300">
              How the rating works
            </a>
            ). The tabs show different periods:
          </p>
          <Terms
            items={[
              [
                "Season",
                `Everyone's rating this season. Players with fewer than ${PROVISIONAL_MATCHES} matches are listed apart under "Placement" until their rating has settled.`,
              ],
              [
                "Today, 7 days, 30 days",
                "Who gained the most rating in that period: a quick way to see who is on fire right now.",
              ],
              [
                "Form",
                `The last ${FORM_LENGTH} results, oldest on the left: W won, L lost.`,
              ],
              [
                "▲ ▼ arrows",
                "Places gained or lost compared with one week ago.",
              ],
              [
                "Big number, small number",
                "The rating, and below it wins-losses.",
              ],
            ]}
          />
          <H3>Top pairs</H3>
          <p>
            The best 2v2 duos of the season by their pair rating (a pair needs
            at least {PAIR_MIN_MATCHES} matches together to appear).
          </p>
          <H3>Highlights</H3>
          <Terms
            items={[
              [
                "🔥 Hot streak",
                `The longest current winning streak (at least ${HOT_STREAK_MIN} in a row).`,
              ],
              ["📈 Rising", "Who gained the most rating in the last 7 days."],
              [
                "😱 Biggest upset",
                `The season's biggest surprise: a win against opponents rated at least ${UPSET_MIN_GAP} points higher.`,
              ],
              [
                "⚡ Most active",
                `Who played the most in the last 7 days (at least ${ACTIVE_MIN_MATCHES} matches).`,
              ],
            ]}
          />
          <H3>Recent matches</H3>
          <p>
            The latest results. The small coloured number under each side is how
            much that side&apos;s team rating went up or down (see{" "}
            <a href="#teams" className="text-blue-500 dark:text-blue-300">
              Teams
            </a>
            ); 🏅 means an achievement was earned in that match.
          </p>
        </Section>

        <Section
          id="matches"
          title="Matches"
          intro="Every result ever entered, newest first."
        >
          <p>
            Filter by <b>format</b> (1v1 or 2v2), by <b>player</b> (all matches
            someone played, on either side) and by <b>season</b> (or all
            seasons). The filters stay in the page address, so you can bookmark
            or share a filtered list. <b>✎ Edit</b> appears on matches you can
            still correct (see{" "}
            <a href="#mistakes" className="text-blue-500 dark:text-blue-300">
              Fixing mistakes
            </a>
            ).
          </p>
        </Section>

        <Section
          id="players"
          title="Players"
          intro="Everyone who plays, with their individual rating and statistics."
        >
          <p>
            The list ranks players by rating, for the selected season or{" "}
            <b>all time</b> (all matches ever, as if it were one long season).
            Click a column to sort by it.
          </p>
          <Terms
            items={[
              [
                "Rating",
                `The individual rating. An asterisk (*) means fewer than ${PROVISIONAL_MATCHES} matches: still provisional.`,
              ],
              ["W / L", "Matches won and lost."],
              ["Win %", "Share of matches won."],
              ["+/−", "Goal difference: goals scored minus goals conceded."],
              [
                "Streak",
                "The current run: W3 means three wins in a row, L2 two losses.",
              ],
            ]}
          />
          <H3>A player&apos;s page</H3>
          <p>
            Current, highest and lowest rating; wins, goals and streaks; results
            per format (1v1 and 2v2); a chart of the rating match by match; and
            two tables: <b>Partners</b> (how you do <i>with</i> each teammate)
            and <b>Opponents</b> (how you do <i>against</i> each one). Best
            partner and toughest opponent are picked from those.
          </p>
          <H3>Managing players</H3>
          <p>
            Anyone can add or rename a player, or <b>archive</b> someone who no
            longer plays (hidden from the match entry, results kept). Deleting a
            player who has played also deletes their matches, so only the admin
            can do it.
          </p>
        </Section>

        <Section
          id="teams"
          title="Teams"
          intro="The same matches seen from the side of each team instead of each person."
        >
          <p>
            A <b>team</b> is whoever stood on one side of the table:{" "}
            <b>Singles</b> are players on their own (1v1), <b>Pairs</b> are two
            players together (2v2). Elena + Chiara is always the same pair, in
            whichever order they were entered. Each team has its own rating,
            separate from its players&apos; ratings: a pair can be much stronger
            (or weaker) than its two players apart.
          </p>
          <Terms
            items={[
              ["Matches, Wins, Losses", "This season, as this team."],
              [
                "Goals",
                "Goals this team scored in the season, added up; Ø is the average per match.",
              ],
              ["Win rate", "Share of matches won."],
              [
                "🏅 Points",
                <>
                  Achievement points: each{" "}
                  <a
                    href="#achievements"
                    className="text-blue-500 dark:text-blue-300"
                  >
                    achievement
                  </a>{" "}
                  earned this season is worth 10, 25 or 50 points, and this is
                  their total.
                </>,
              ],
              ["Rating", "The team's own rating this season."],
            ]}
          />
          <p>
            A team&apos;s page shows its numbers, its rating chart, its
            achievements, and a <b>Versus</b> menu to compare it with another
            team head to head.
          </p>
        </Section>

        <Section
          id="hall-of-fame"
          title="Hall of Fame"
          intro="The home page is about now; the Hall of Fame is about all time."
        >
          <Terms
            items={[
              [
                "🏔️ Highest rating",
                `The highest rating anyone reached (counted only after their first ${PROVISIONAL_MATCHES} matches of a season, when ratings jump around).`,
              ],
              ["🔥 Longest win streak", "The most wins in a row."],
              [
                "🏆 Most wins",
                `The most matches won, all time (among players with at least ${MOST_WINS_MIN_MATCHES} matches).`,
              ],
              ["💥 Biggest win", "The widest goal margin in one match."],
              [
                "😱 Biggest upset",
                "The win against the highest-rated opponents, compared with the winners' own rating.",
              ],
              [
                "⏱️ Marathon day",
                "The most matches one player played in a day.",
              ],
              [
                "Champions",
                `For every season: the best-rated player at the end (with at least ${PROVISIONAL_MATCHES} matches) and the best pair. The current season shows who is leading.`,
              ],
            ]}
          />
          <p>
            When two people share a record, it belongs to whoever set it first.
          </p>
        </Section>

        <Section
          id="rating"
          title="How the rating works"
          intro="biliardino uses the Elo system, the one used to rank chess players."
        >
          <p>
            Everyone starts at <b>{defaultRating}</b>. After each match the
            winners gain points and the losers lose the same amount. How many
            depends on how surprising the result was:{" "}
            <b>
              beating someone stronger is worth a lot, beating someone weaker
              very little
            </b>
            . The goal difference doesn&apos;t matter, only who won (a draw
            counts as half a win).
          </p>
          <div className="rounded-lg bg-gray-100 dark:bg-gray-900 p-3">
            <p className="font-semibold">Example</p>
            <p>
              Anna ({ex.anna}) plays Marco ({ex.marco}). Before the game the
              formula gives Anna a {ex.chance}% chance of winning.
            </p>
            <ul className="list-disc pl-5">
              <li>
                If Anna wins, the surprise is big: Anna <b>+{ex.annaWins}</b>,
                Marco <b>−{ex.annaWins}</b>.
              </li>
              <li>
                If Marco wins, it was expected: Marco <b>+{ex.marcoWins}</b>,
                Anna <b>−{ex.marcoWins}</b>.
              </li>
            </ul>
          </div>
          <Terms
            items={[
              [
                "2v2",
                "Each side counts with the average rating of its two players. Both players of the winning side gain, both of the losing side lose.",
              ],
              [
                "Speed (K)",
                `Ratings move faster at the start: up to 32 points per match below ${defaultRating + 200}, 24 up to ${defaultRating + 400}, 16 above. Newcomers find their level quickly, top players are stable.`,
              ],
              [
                "Provisional",
                `With fewer than ${PROVISIONAL_MATCHES} matches the rating isn't reliable yet, so it is marked (*) and kept out of the main ranking.`,
              ],
              [
                "Two kinds of rating",
                "Every player has an individual rating (Leaderboard, Players), and every team has its own (Teams, Top pairs). They are calculated the same way, from the same matches.",
              ],
              [
                "Always up to date",
                "Ratings are recalculated from the matches, so correcting or deleting a match fixes everyone's numbers automatically.",
              ],
            ]}
          />
        </Section>

        <Section
          id="seasons"
          title="Seasons"
          intro="A season is a fresh start: same players, everyone back to 1000."
        >
          <p>
            The admin starts a new season when it&apos;s time (for example every
            few months). New matches then count for the new season and ratings
            start again at {defaultRating}. Old seasons are never lost: pick one
            in the <b>Season</b> menu next to the logo to look at it, and its
            champion stays in the Hall of Fame.
          </p>
        </Section>

        <Section
          id="achievements"
          title="Achievements"
          intro="Small badges for milestones, streaks and fun moments, earned by teams in a season."
        >
          <p>
            Achievements belong to a <b>team</b> (you alone in 1v1, or a pair in
            2v2) and to the season in which they were earned. Each is worth 10,
            25 or 50 points; the total is the 🏅 column on the Teams page. A 🏅
            next to a match shows one was earned there.
          </p>
          <details className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <summary className="cursor-pointer font-semibold">
              All {shown.length} achievements
            </summary>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-700">
              {shown.map(a => (
                <li key={a.id} className="flex gap-3 py-1.5 text-sm">
                  <span className="w-8 shrink-0 text-right tabular-nums font-semibold text-blue-500 dark:text-blue-300">
                    {a.points}
                  </span>
                  <span>
                    <b>{a.title}</b>
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      · {a.description.replace(/\s+/g, " ")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </Section>

        <Section
          id="mistakes"
          title="Fixing mistakes"
          intro="Wrong score, wrong player? It can be fixed."
        >
          <Terms
            items={[
              [
                `First ${EDIT_WINDOW_HOURS} hours`,
                "Anyone can correct or delete a match with ✎ Edit on the match. Ratings of the whole season are recalculated.",
              ],
              [
                `After ${EDIT_WINDOW_HOURS} hours`,
                "Only the admin can change it (Admin link at the bottom of the page).",
              ],
              [
                "Saved twice?",
                "The same teams with the same result within 5 minutes are refused, so a double tap on Save doesn't count twice.",
              ],
            ]}
          />
          <p>
            Still something unclear? Ask the person who runs biliardino in your
            office, or go back{" "}
            <Link href="/" className="text-blue-500 dark:text-blue-300">
              home
            </Link>{" "}
            and play a match.
          </p>
        </Section>
      </div>
    </>
  );
};

export default Help;
