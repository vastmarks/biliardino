-- CreateTable
CREATE TABLE "player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "player_key_key" ON "player"("key");

-- Seed: a fresh install needs an active season, otherwise matches can't be entered
INSERT INTO "season" ("number", "current")
SELECT 1, true WHERE NOT EXISTS (SELECT 1 FROM "season");
