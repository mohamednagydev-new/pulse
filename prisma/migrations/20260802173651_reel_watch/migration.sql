-- CreateTable
CREATE TABLE "ReelWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "watchedSec" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ReelWatch_userId_createdAt_idx" ON "ReelWatch"("userId", "createdAt");
