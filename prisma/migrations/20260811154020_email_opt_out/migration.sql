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
    "coachFeatured" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("avatarUrl", "avoidFoods", "bio", "birthYear", "coachBio", "coachFeatured", "coachHeadline", "coachSpecialties", "coachVerified", "country", "createdAt", "currentStreak", "dietPref", "email", "firstName", "fitnessGoal", "fitnessLevel", "gender", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "lastSeenAt", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "referralCode", "referredById", "reminderHour", "role", "scheduleJson", "streakFreezes", "weightKg", "xp", "zip") SELECT "avatarUrl", "avoidFoods", "bio", "birthYear", "coachBio", "coachFeatured", "coachHeadline", "coachSpecialties", "coachVerified", "country", "createdAt", "currentStreak", "dietPref", "email", "firstName", "fitnessGoal", "fitnessLevel", "gender", "goalCalories", "goalCarbs", "goalFat", "goalProtein", "heightCm", "id", "isCoach", "lastActiveOn", "lastName", "lastSeenAt", "level", "longestStreak", "mobile", "onboarded", "passwordHash", "preferredLang", "provider", "providerId", "referralCode", "referredById", "reminderHour", "role", "scheduleJson", "streakFreezes", "weightKg", "xp", "zip" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
