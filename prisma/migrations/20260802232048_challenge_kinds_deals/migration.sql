-- CreateTable
CREATE TABLE "PartnerDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "code" TEXT,
    "discount" TEXT,
    "image" TEXT,
    "validUntil" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "redeems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerDeal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
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
    "sponsorUrl" TEXT
);
INSERT INTO "new_Challenge" ("coverImage", "description", "endsOn", "goalType", "goalValue", "id", "seasonKey", "sponsorName", "sponsorUrl", "startsOn", "title", "titleAr") SELECT "coverImage", "description", "endsOn", "goalType", "goalValue", "id", "seasonKey", "sponsorName", "sponsorUrl", "startsOn", "title", "titleAr" FROM "Challenge";
DROP TABLE "Challenge";
ALTER TABLE "new_Challenge" RENAME TO "Challenge";
CREATE UNIQUE INDEX "Challenge_inviteCode_key" ON "Challenge"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
