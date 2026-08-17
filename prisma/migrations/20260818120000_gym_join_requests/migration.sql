-- CreateTable
CREATE TABLE "GymJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "GymJoinRequest_partnerId_status_idx" ON "GymJoinRequest"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GymJoinRequest_partnerId_userId_key" ON "GymJoinRequest"("partnerId", "userId");

