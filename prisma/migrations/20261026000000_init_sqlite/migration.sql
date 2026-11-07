-- CreateTable
CREATE TABLE "match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "team1" TEXT NOT NULL,
    "team2" TEXT NOT NULL,
    "score1" INTEGER NOT NULL,
    "score2" INTEGER NOT NULL,
    "team1RatingChange" REAL NOT NULL DEFAULT 0,
    "team2RatingChange" REAL NOT NULL DEFAULT 0,
    "team1Rating" REAL NOT NULL DEFAULT 0,
    "team2Rating" REAL NOT NULL DEFAULT 0,
    "comment" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "teamsize" INTEGER NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "teamsize" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "team_meta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season" INTEGER NOT NULL DEFAULT 1,
    "teamId" INTEGER NOT NULL,
    "rating" REAL NOT NULL DEFAULT 0,
    "achievementPoints" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "totalWinRate" REAL NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalAvgScore" REAL NOT NULL DEFAULT 0,
    "totalHighestRating" REAL NOT NULL DEFAULT 0,
    "totalLowestRating" REAL NOT NULL DEFAULT 0,
    "totalHighestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "totalHighestLosingStreak" INTEGER NOT NULL DEFAULT 0,
    "dailyMatches" INTEGER NOT NULL DEFAULT 0,
    "dailyWins" INTEGER NOT NULL DEFAULT 0,
    "dailyLosses" INTEGER NOT NULL DEFAULT 0,
    "dailyWinRate" REAL NOT NULL DEFAULT 0,
    "dailyScore" INTEGER NOT NULL DEFAULT 0,
    "dailyAvgScore" REAL NOT NULL DEFAULT 0,
    "currentWinStreak" INTEGER NOT NULL DEFAULT 0,
    "currentLosingStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_meta_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_achievement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamName" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "achievement" TEXT NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 1,
    "matchId" INTEGER NOT NULL,
    CONSTRAINT "team_achievement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_achievement_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "number" INTEGER NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "match_season_idx" ON "match"("season");

-- CreateIndex
CREATE UNIQUE INDEX "team_name_key" ON "team"("name");

-- CreateIndex
CREATE INDEX "team_meta_teamId_season_idx" ON "team_meta"("teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "team_meta_season_teamId_key" ON "team_meta"("season", "teamId");

-- CreateIndex
CREATE INDEX "team_achievement_matchId_teamId_idx" ON "team_achievement"("matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "season_number_key" ON "season"("number");

-- CreateIndex
CREATE INDEX "season_number_idx" ON "season"("number");
