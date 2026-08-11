-- CreateTable
CREATE TABLE "CoachProgramEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "completedDays" TEXT NOT NULL DEFAULT '[]',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachProgramEnrollment_userId_programId_key" ON "CoachProgramEnrollment"("userId", "programId");
