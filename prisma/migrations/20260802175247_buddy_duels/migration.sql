-- CreateTable
CREATE TABLE "BuddyChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "wagerXp" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BuddyChallenge_challengerId_idx" ON "BuddyChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "BuddyChallenge_opponentId_idx" ON "BuddyChallenge"("opponentId");
