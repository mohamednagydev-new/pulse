-- CreateTable
CREATE TABLE "CuratedReel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'tiktok',
    "tiktokId" TEXT,
    "keyword" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'workout',
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "videoId" TEXT NOT NULL,
    "poster" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratedReel_tiktokId_key" ON "CuratedReel"("tiktokId");
