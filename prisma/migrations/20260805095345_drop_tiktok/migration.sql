/*
  Warnings:

  - You are about to drop the column `tiktokId` on the `CuratedReel` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CuratedReel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'youtube',
    "provider" TEXT NOT NULL DEFAULT 'youtube',
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_CuratedReel" ("active", "ageRestricted", "authorName", "authorUrl", "coverUrl", "createdAt", "externalId", "id", "keyword", "order", "playUrl", "poster", "provider", "source", "sourceUrl", "title", "titleAr", "topic", "videoId") SELECT "active", "ageRestricted", "authorName", "authorUrl", "coverUrl", "createdAt", "externalId", "id", "keyword", "order", "playUrl", "poster", "provider", "source", "sourceUrl", "title", "titleAr", "topic", "videoId" FROM "CuratedReel";
DROP TABLE "CuratedReel";
ALTER TABLE "new_CuratedReel" RENAME TO "CuratedReel";
CREATE UNIQUE INDEX "CuratedReel_provider_externalId_key" ON "CuratedReel"("provider", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
