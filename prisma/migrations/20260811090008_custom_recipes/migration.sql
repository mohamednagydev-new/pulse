-- CreateTable
CREATE TABLE "CustomRecipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "items" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fat" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomRecipe_userId_idx" ON "CustomRecipe"("userId");
