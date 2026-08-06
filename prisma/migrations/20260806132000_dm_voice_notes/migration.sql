-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DMMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT,
    "audio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "DMMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DMThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DMMessage" ("createdAt", "id", "readAt", "senderId", "text", "threadId") SELECT "createdAt", "id", "readAt", "senderId", "text", "threadId" FROM "DMMessage";
DROP TABLE "DMMessage";
ALTER TABLE "new_DMMessage" RENAME TO "DMMessage";
CREATE INDEX "DMMessage_threadId_createdAt_idx" ON "DMMessage"("threadId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
