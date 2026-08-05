-- CreateTable
CREATE TABLE "CoachProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "days" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "section" TEXT NOT NULL,
    "title" TEXT,
    "titleAr" TEXT,
    "subtitle" TEXT,
    "subtitleAr" TEXT,
    "image" TEXT,
    "linkType" TEXT,
    "linkId" TEXT,
    "url" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Banner" ("id", "image", "linkId", "linkType", "order", "section", "subtitle", "subtitleAr", "title", "titleAr", "url") SELECT "id", "image", "linkId", "linkType", "order", "section", "subtitle", "subtitleAr", "title", "titleAr", "url" FROM "Banner";
DROP TABLE "Banner";
ALTER TABLE "new_Banner" RENAME TO "Banner";
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
    "reminderHour" INTEGER,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_User" ("avatarUrl", "bio", "coachBio", "coachHeadline", "coachSpecialties", "coachVerified", "createdAt", "currentStreak", "email", "firstName", "fitnessGoal", "fitnessLevel", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "reminderHour", "role", "weightKg", "xp", "zip") SELECT "avatarUrl", "bio", "coachBio", "coachHeadline", "coachSpecialties", "coachVerified", "createdAt", "currentStreak", "email", "firstName", "fitnessGoal", "fitnessLevel", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "reminderHour", "role", "weightKg", "xp", "zip" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
