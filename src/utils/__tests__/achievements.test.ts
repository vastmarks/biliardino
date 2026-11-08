import {
  Achievement,
  achievementPoints,
  achievements,
  career,
  checkAchievements,
} from "~/utils/achievements";
import type { Match, Team, TeamMeta } from "~/generated/prisma/browser";
import { TeamWithMetaAndAchievements } from "~/server/model/team";
import { getDefaultTeamMeta, getTeamSize } from "~/model";

function getAchievement(id: string): Achievement {
  return achievements.find(a => a.id === id)!;
}

function createTeam(
  name: string,
  meta?: Partial<TeamMeta>,
): TeamWithMetaAndAchievements {
  return {
    id: 0,
    name,
    meta: [
      {
        ...getDefaultTeamMeta(1),
        ...meta,
        teamId: 0,
      },
    ],
    createdAt: new Date(),
    teamsize: getTeamSize(name),
    achievements: [],
  };
}

function createMatch(
  team1: Team,
  team2: Team,
  score1: number,
  score2: number,
): Match {
  return {
    id: 0,
    createdAt: new Date(),
    team1: team1.name,
    team2: team2.name,
    score1,
    score2,
    comment: "",
    team1Rating: 0,
    team1RatingChange: 0,
    team2Rating: 0,
    team2RatingChange: 0,
    game: "test",
    teamsize: getTeamSize(team1.name),
    season: 1,
  };
}

describe("underdog", () => {
  test("granted", () => {
    const achievement = getAchievement("underdog");
    const player = createTeam("player", {
      rating: 700,
    });
    const opponent = createTeam("opponent", {
      rating: 800,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(true);
  });

  test("granted alt", () => {
    const achievement = getAchievement("underdog");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1400,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(true);
  });

  test("denied", () => {
    const achievement = getAchievement("underdog");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1050,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(false);
  });

  test("denied reversed rating", () => {
    const achievement = getAchievement("underdog");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 800,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(false);
  });

  test("denied by result", () => {
    const achievement = getAchievement("underdog");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1200,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );
    expect(granted).toBe(false);
  });
});

describe("badday", () => {
  test("granted", () => {
    const achievement = getAchievement("badday");
    const player = createTeam("player", {
      rating: 900,
    });
    const opponent = createTeam("opponent", {
      rating: 800,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );

    expect(granted).toBe(true);
  });

  test("granted alt", () => {
    const achievement = getAchievement("badday");
    const player = createTeam("player", {
      rating: 1400,
    });
    const opponent = createTeam("opponent", {
      rating: 900,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );

    expect(granted).toBe(true);
  });

  test("denied", () => {
    const achievement = getAchievement("badday");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1200,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );

    expect(granted).toBe(false);
  });

  test("denied by result", () => {
    const achievement = getAchievement("badday");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1100,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );

    expect(granted).toBe(false);
  });
});

describe("david", () => {
  test("granted", () => {
    const achievement = getAchievement("david");
    const player = createTeam("player", {
      rating: 700,
    });
    const opponent = createTeam("opponent", {
      rating: 950,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(true);
  });

  test("granted alt", () => {
    const achievement = getAchievement("david");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1400,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(true);
  });

  test("denied", () => {
    const achievement = getAchievement("david");
    const player = createTeam("player", {
      rating: 1200,
    });
    const opponent = createTeam("opponent", {
      rating: 800,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(false);
  });

  test("denied by result", () => {
    const achievement = getAchievement("david");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1200,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );
    expect(granted).toBe(false);
  });
});

describe("goliath", () => {
  test("granted", () => {
    const achievement = getAchievement("goliath");
    const player = createTeam("player", {
      rating: 950,
    });
    const opponent = createTeam("opponent", {
      rating: 700,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );
    expect(granted).toBe(true);
  });

  test("granted alt", () => {
    const achievement = getAchievement("goliath");
    const player = createTeam("player", {
      rating: 1400,
    });
    const opponent = createTeam("opponent", {
      rating: 1000,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );
    expect(granted).toBe(true);
  });

  test("denied", () => {
    const achievement = getAchievement("goliath");
    const player = createTeam("player", {
      rating: 1200,
    });
    const opponent = createTeam("opponent", {
      rating: 800,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 1, 0),
    );
    expect(granted).toBe(false);
  });

  test("denied by result", () => {
    const achievement = getAchievement("goliath");
    const player = createTeam("player", {
      rating: 1000,
    });
    const opponent = createTeam("opponent", {
      rating: 1400,
    });

    const granted = achievement.condition(
      player,
      opponent,
      createMatch(player, opponent, 0, 1),
    );
    expect(granted).toBe(false);
  });
});

describe("across seasons", () => {
  const withSeasons = (
    name: string,
    seasons: Array<Partial<TeamMeta> & { season: number }>,
  ): TeamWithMetaAndAchievements => ({
    ...createTeam(name),
    meta: seasons.map(m => ({
      ...getDefaultTeamMeta(m.season),
      ...m,
      teamId: 0,
    })),
  });

  test("milestones count the wins of all seasons", () => {
    const team = withSeasons("anna", [
      { season: 1, totalWins: 6, totalMatches: 8 },
      { season: 2, totalWins: 4, totalMatches: 5 },
    ]);
    expect(career(team)).toMatchObject({ totalWins: 10, totalMatches: 13 });
    const opp = createTeam("bob");
    const m = { ...createMatch(team, opp, 10, 5), season: 2 };
    expect(getAchievement("wins-10").condition(team, opp, m)).toBe(true);
  });

  test("an achievement earned in an earlier season is not earned again", () => {
    const team = withSeasons("anna", [
      { season: 1, totalWins: 1, totalMatches: 1 },
      { season: 2, totalWins: 1, totalMatches: 1 },
    ]);
    team.achievements = [
      {
        id: 1,
        createdAt: new Date(),
        teamId: 0,
        teamName: "anna",
        achievement: "wins-1",
        season: 1,
        matchId: 1,
      },
    ];
    const opp = createTeam("bob");
    const m = { ...createMatch(team, opp, 10, 5), season: 2 };
    expect(checkAchievements(team, opp, m).map(a => a.id)).not.toContain(
      "wins-1",
    );
  });

  test("points add up each achievement once", () => {
    const first = getAchievement("wins-1").points;
    const tenth = getAchievement("wins-10").points;
    expect(
      achievementPoints([
        { achievement: "wins-1" },
        { achievement: "wins-1" },
        { achievement: "wins-10" },
        { achievement: "no-longer-exists" },
      ]),
    ).toBe(first + tenth);
  });

  test("5000 goals needs 5000 goals", () => {
    const opp = createTeam("bob");
    const team = withSeasons("anna", [{ season: 1, totalScore: 4999 }]);
    const m = createMatch(team, opp, 10, 5);
    expect(getAchievement("score-5000").condition(team, opp, m)).toBe(false);
  });
});
