-- Players can be archived: hidden from the match entry, history kept
ALTER TABLE "player" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
