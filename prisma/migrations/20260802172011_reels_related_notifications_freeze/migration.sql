-- AlterTable
ALTER TABLE "Article" ADD COLUMN "reelKeyword" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "reelKeyword" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "reelKeyword" TEXT;

-- AlterTable
ALTER TABLE "MuscleGroup" ADD COLUMN "reelKeyword" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "reelKeyword" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "mobile" TEXT,
    "zip" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "provider" TEXT,
    "providerId" TEXT,
    "preferredLang" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fitnessGoal" TEXT,
    "fitnessLevel" TEXT,
    "heightCm" INTEGER,
    "weightKg" REAL,
    "goalCalories" INTEGER,
    "goalProtein" INTEGER,
    "goalCarbs" INTEGER,
    "goalFat" INTEGER,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveOn" TEXT,
    "streakFreezes" INTEGER NOT NULL DEFAULT 1,
    "reminderHour" INTEGER,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "scheduleJson" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "bio" TEXT,
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "coachHeadline" TEXT,
    "coachBio" TEXT,
    "coachSpecialties" TEXT,
    "coachVerified" BOOLEAN NOT NULL DEFAULT false,
    "coachFeatured" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("avatarUrl", "bio", "coachBio", "coachFeatured", "coachHeadline", "coachSpecialties", "coachVerified", "createdAt", "currentStreak", "email", "firstName", "fitnessGoal", "fitnessLevel", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "reminderHour", "role", "scheduleJson", "weightKg", "xp", "zip") SELECT "avatarUrl", "bio", "coachBio", "coachFeatured", "coachHeadline", "coachSpecialties", "coachVerified", "createdAt", "currentStreak", "email", "firstName", "fitnessGoal", "fitnessLevel", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "reminderHour", "role", "scheduleJson", "weightKg", "xp", "zip" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
