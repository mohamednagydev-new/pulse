-- AlterTable
ALTER TABLE "CoachProgramEnrollment" ADD COLUMN "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN "inviteCode" TEXT;

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "exercises" TEXT NOT NULL,
    "muscleFocus" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sourceId" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActivityInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'walk',
    "note" TEXT,
    "whenText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CoachProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "days" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CoachProgram" ("coachUserId", "coverImage", "createdAt", "days", "description", "id", "title") SELECT "coachUserId", "coverImage", "createdAt", "days", "description", "id", "title" FROM "CoachProgram";
DROP TABLE "CoachProgram";
ALTER TABLE "new_CoachProgram" RENAME TO "CoachProgram";
CREATE TABLE "new_LiftLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "reps" INTEGER NOT NULL,
    "setType" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_LiftLog" ("createdAt", "exercise", "id", "reps", "userId", "weightKg") SELECT "createdAt", "exercise", "id", "reps", "userId", "weightKg" FROM "LiftLog";
DROP TABLE "LiftLog";
ALTER TABLE "new_LiftLog" RENAME TO "LiftLog";
CREATE INDEX "LiftLog_userId_exercise_idx" ON "LiftLog"("userId", "exercise");
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
    "preferredLang" TEXT NOT NULL DEFAULT 'ar',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fitnessGoal" TEXT,
    "fitnessLevel" TEXT,
    "gender" TEXT,
    "birthYear" INTEGER,
    "heightCm" INTEGER,
    "weightKg" REAL,
    "goalCalories" INTEGER,
    "goalProtein" INTEGER,
    "goalCarbs" INTEGER,
    "goalFat" INTEGER,
    "country" TEXT,
    "dietPref" TEXT,
    "avoidFoods" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveOn" TEXT,
    "lastSeenAt" DATETIME,
    "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
    "dietStartedAt" DATETIME,
    "dietStartWeightKg" REAL,
    "targetWeightKg" REAL,
    "streakFreezes" INTEGER NOT NULL DEFAULT 1,
    "reminderHour" INTEGER,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "scheduleJson" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "bio" TEXT,
    "referralCode" TEXT,
    "referredById" TEXT,
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "coachHeadline" TEXT,
    "coachBio" TEXT,
    "coachSpecialties" TEXT,
    "coachVerified" BOOLEAN NOT NULL DEFAULT false,
    "coachFeatured" BOOLEAN NOT NULL DEFAULT false,
    "coachInviteCode" TEXT,
    "restSeconds" INTEGER NOT NULL DEFAULT 45,
    "goalText" TEXT,
    "goalSharedAt" DATETIME,
    "gymId" TEXT,
    "gymJoinedAt" DATETIME
);
INSERT INTO "new_User" ("avatarUrl", "avoidFoods", "bio", "birthYear", "coachBio", "coachFeatured", "coachHeadline", "coachSpecialties", "coachVerified", "country", "createdAt", "currentStreak", "dietPref", "dietStartWeightKg", "dietStartedAt", "email", "emailOptOut", "firstName", "fitnessGoal", "fitnessLevel", "gender", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "lastSeenAt", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "referralCode", "referredById", "reminderHour", "role", "scheduleJson", "streakFreezes", "targetWeightKg", "weightKg", "xp", "zip") SELECT "avatarUrl", "avoidFoods", "bio", "birthYear", "coachBio", "coachFeatured", "coachHeadline", "coachSpecialties", "coachVerified", "country", "createdAt", "currentStreak", "dietPref", "dietStartWeightKg", "dietStartedAt", "email", "emailOptOut", "firstName", "fitnessGoal", "fitnessLevel", "gender", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "lastSeenAt", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "referralCode", "referredById", "reminderHour", "role", "scheduleJson", "streakFreezes", "targetWeightKg", "weightKg", "xp", "zip" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE UNIQUE INDEX "User_coachInviteCode_key" ON "User"("coachInviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Routine_userId_idx" ON "Routine"("userId");

-- CreateIndex
CREATE INDEX "ActivityInvite_toUserId_status_idx" ON "ActivityInvite"("toUserId", "status");

-- CreateIndex
CREATE INDEX "ActivityInvite_fromUserId_idx" ON "ActivityInvite"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_inviteCode_key" ON "Partner"("inviteCode");

