-- AlterTable
ALTER TABLE "ChallengeParticipant" ADD COLUMN "completedAt" DATETIME;

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "room" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "result" TEXT,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "goalType" TEXT NOT NULL,
    "goalValue" INTEGER NOT NULL,
    "startsOn" TEXT NOT NULL,
    "endsOn" TEXT NOT NULL,
    "coverImage" TEXT,
    "seasonKey" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'global',
    "ownerId" TEXT,
    "inviteCode" TEXT,
    "sponsorName" TEXT,
    "sponsorUrl" TEXT,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium'
);
INSERT INTO "new_Challenge" ("coverImage", "description", "descriptionAr", "endsOn", "goalType", "goalValue", "id", "inviteCode", "kind", "ownerId", "seasonKey", "sponsorName", "sponsorUrl", "startsOn", "title", "titleAr") SELECT "coverImage", "description", "descriptionAr", "endsOn", "goalType", "goalValue", "id", "inviteCode", "kind", "ownerId", "seasonKey", "sponsorName", "sponsorUrl", "startsOn", "title", "titleAr" FROM "Challenge";
DROP TABLE "Challenge";
ALTER TABLE "new_Challenge" RENAME TO "Challenge";
CREATE UNIQUE INDEX "Challenge_inviteCode_key" ON "Challenge"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LeagueMember_weekKey_tier_room_idx" ON "LeagueMember"("weekKey", "tier", "room");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_userId_weekKey_key" ON "LeagueMember"("userId", "weekKey");
