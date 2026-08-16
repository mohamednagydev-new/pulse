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
    "prizeText" TEXT,
    "prizeTextAr" TEXT,
    "prizeMode" TEXT NOT NULL DEFAULT 'top3',
    "difficulty" TEXT NOT NULL DEFAULT 'medium'
);
INSERT INTO "new_Challenge" ("coverImage", "description", "descriptionAr", "difficulty", "endsOn", "goalType", "goalValue", "id", "inviteCode", "kind", "ownerId", "prizeText", "prizeTextAr", "rewardXp", "seasonKey", "sponsorName", "sponsorUrl", "startsOn", "title", "titleAr") SELECT "coverImage", "description", "descriptionAr", "difficulty", "endsOn", "goalType", "goalValue", "id", "inviteCode", "kind", "ownerId", "prizeText", "prizeTextAr", "rewardXp", "seasonKey", "sponsorName", "sponsorUrl", "startsOn", "title", "titleAr" FROM "Challenge";
DROP TABLE "Challenge";
ALTER TABLE "new_Challenge" RENAME TO "Challenge";
CREATE UNIQUE INDEX "Challenge_inviteCode_key" ON "Challenge"("inviteCode");
CREATE TABLE "new_ChallengeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT,
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT NOT NULL,
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "isProof" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeMessage_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChallengeMessage" ("challengeId", "createdAt", "id", "isCoach", "text", "userId") SELECT "challengeId", "createdAt", "id", "isCoach", "text", "userId" FROM "ChallengeMessage";
DROP TABLE "ChallengeMessage";
ALTER TABLE "new_ChallengeMessage" RENAME TO "ChallengeMessage";
CREATE INDEX "ChallengeMessage_challengeId_createdAt_idx" ON "ChallengeMessage"("challengeId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
