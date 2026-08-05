-- CreateTable
CREATE TABLE "ReelFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "topic" TEXT,
    "title" TEXT,
    "coverUrl" TEXT,
    "playUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReelKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "LiftLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "reps" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ReelFavorite_userId_key_key" ON "ReelFavorite"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ReelKeyword_keyword_key" ON "ReelKeyword"("keyword");

-- CreateIndex
CREATE INDEX "LiftLog_userId_exercise_idx" ON "LiftLog"("userId", "exercise");
