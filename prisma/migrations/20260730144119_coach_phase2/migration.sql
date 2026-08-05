-- CreateTable
CREATE TABLE "CoachWorkout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "muscleFocus" TEXT,
    "exercises" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CoachRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CoachRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachRequest_clientId_coachUserId_key" ON "CoachRequest"("clientId", "coachUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachRating_clientId_coachUserId_key" ON "CoachRating"("clientId", "coachUserId");
