-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CuratedReel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'tiktok',
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
INSERT INTO "new_CuratedReel" ("active", "createdAt", "id", "keyword", "order", "poster", "source", "tiktokId", "title", "titleAr", "topic", "videoId") SELECT "active", "createdAt", "id", "keyword", "order", "poster", "source", "tiktokId", "title", "titleAr", "topic", "videoId" FROM "CuratedReel";
DROP TABLE "CuratedReel";
ALTER TABLE "new_CuratedReel" RENAME TO "CuratedReel";
CREATE UNIQUE INDEX "CuratedReel_tiktokId_key" ON "CuratedReel"("tiktokId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
