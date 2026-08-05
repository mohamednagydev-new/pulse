-- CreateTable
CREATE TABLE "BlockedSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CuratedReel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'tiktok',
    "provider" TEXT NOT NULL DEFAULT 'tiktok',
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "tiktokId" TEXT,
    "keyword" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'workout',
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "videoId" TEXT,
    "poster" TEXT,
    "playUrl" TEXT,
    "coverUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CuratedReel" ("active", "coverUrl", "createdAt", "id", "keyword", "order", "playUrl", "poster", "source", "tiktokId", "title", "titleAr", "topic", "videoId") SELECT "active", "coverUrl", "createdAt", "id", "keyword", "order", "playUrl", "poster", "source", "tiktokId", "title", "titleAr", "topic", "videoId" FROM "CuratedReel";
DROP TABLE "CuratedReel";
ALTER TABLE "new_CuratedReel" RENAME TO "CuratedReel";
CREATE UNIQUE INDEX "CuratedReel_tiktokId_key" ON "CuratedReel"("tiktokId");
CREATE UNIQUE INDEX "CuratedReel_provider_externalId_key" ON "CuratedReel"("provider", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BlockedSource_provider_handle_key" ON "BlockedSource"("provider", "handle");
