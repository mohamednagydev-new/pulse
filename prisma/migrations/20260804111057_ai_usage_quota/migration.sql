-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "AiUsage_date_idx" ON "AiUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_date_kind_key" ON "AiUsage"("userId", "date", "kind");
