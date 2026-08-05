-- CreateTable
CREATE TABLE "DeviceConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "externalId" TEXT,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportedActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "startedAt" DATETIME NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "distanceM" REAL,
    "calories" REAL,
    "avgHr" REAL,
    "credited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportedActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeviceConnection_provider_externalId_idx" ON "DeviceConnection"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceConnection_userId_provider_key" ON "DeviceConnection"("userId", "provider");

-- CreateIndex
CREATE INDEX "ImportedActivity_userId_startedAt_idx" ON "ImportedActivity"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedActivity_provider_externalId_key" ON "ImportedActivity"("provider", "externalId");
