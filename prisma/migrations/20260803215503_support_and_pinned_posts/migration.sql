-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'suggestion',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contact" TEXT,
    "screen" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reply" TEXT,
    "repliedAt" DATETIME,
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeedPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedUntil" DATETIME,
    "pinnedTitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FeedPost" ("createdAt", "id", "kind", "mediaType", "mediaUrl", "refId", "refType", "text", "userId") SELECT "createdAt", "id", "kind", "mediaType", "mediaUrl", "refId", "refType", "text", "userId" FROM "FeedPost";
DROP TABLE "FeedPost";
ALTER TABLE "new_FeedPost" RENAME TO "FeedPost";
CREATE INDEX "FeedPost_pinned_pinnedUntil_idx" ON "FeedPost"("pinned", "pinnedUntil");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
