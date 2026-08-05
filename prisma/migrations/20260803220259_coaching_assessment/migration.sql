-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "minutesPerSession" INTEGER NOT NULL,
    "equipment" TEXT NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "limitations" TEXT,
    "preferMornings" BOOLEAN NOT NULL DEFAULT false,
    "recommendedLevel" TEXT NOT NULL,
    "programId" TEXT,
    "scheduleDays" TEXT,
    "rationale" TEXT,
    "cautions" TEXT,
    "nextCheckOn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Assessment_userId_createdAt_idx" ON "Assessment"("userId", "createdAt");
