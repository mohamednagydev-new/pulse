-- AlterTable
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "seasonKey" TEXT;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "Event_name_createdAt_idx" ON "Event"("name", "createdAt");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
