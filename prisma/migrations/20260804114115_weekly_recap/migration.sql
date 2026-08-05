-- CreateTable
CREATE TABLE "WeeklyRecap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "stats" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "aiText" TEXT,
    "aiTextAr" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WeeklyRecap_userId_createdAt_idx" ON "WeeklyRecap"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRecap_userId_weekKey_key" ON "WeeklyRecap"("userId", "weekKey");
