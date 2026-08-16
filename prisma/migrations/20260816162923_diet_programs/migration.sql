-- CreateTable
CREATE TABLE "DietProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "days" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'balanced',
    "tipsJson" TEXT NOT NULL DEFAULT '[]',
    "emoji" TEXT NOT NULL DEFAULT '🥗',
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "DietEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "completedDays" TEXT NOT NULL DEFAULT '[]',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "DietEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "DietProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DietEnrollment_userId_programId_key" ON "DietEnrollment"("userId", "programId");
