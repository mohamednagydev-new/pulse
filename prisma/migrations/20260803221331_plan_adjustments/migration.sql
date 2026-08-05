-- CreateTable
CREATE TABLE "PlanAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fromDays" INTEGER,
    "toDays" INTEGER,
    "appliedAt" DATETIME,
    "dismissedAt" DATETIME,
    "activeUntil" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlanAdjustment_userId_createdAt_idx" ON "PlanAdjustment"("userId", "createdAt");
