-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "glasses" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "QuestClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "questKey" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BodyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "waistCm" REAL,
    "chestCm" REAL,
    "armCm" REAL,
    "hipCm" REAL,
    "thighCm" REAL,
    "photo" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WaterLog_userId_date_key" ON "WaterLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "QuestClaim_userId_day_questKey_key" ON "QuestClaim"("userId", "day", "questKey");

-- CreateIndex
CREATE INDEX "BodyLog_userId_date_idx" ON "BodyLog"("userId", "date");
