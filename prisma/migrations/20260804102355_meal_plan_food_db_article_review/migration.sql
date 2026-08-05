-- AlterTable
ALTER TABLE "Article" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "Article" ADD COLUMN "reviewedByAr" TEXT;
ALTER TABLE "Article" ADD COLUMN "reviewedOn" TEXT;
ALTER TABLE "Article" ADD COLUMN "reviewerTitle" TEXT;
ALTER TABLE "Article" ADD COLUMN "reviewerTitleAr" TEXT;
ALTER TABLE "Article" ADD COLUMN "sources" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "carbs" REAL;
ALTER TABLE "Recipe" ADD COLUMN "cuisine" TEXT DEFAULT 'international';
ALTER TABLE "Recipe" ADD COLUMN "fat" REAL;
ALTER TABLE "Recipe" ADD COLUMN "mealSlots" TEXT;
ALTER TABLE "Recipe" ADD COLUMN "protein" REAL;

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "aliases" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "portion" TEXT NOT NULL,
    "portionAr" TEXT NOT NULL,
    "grams" INTEGER,
    "calories" INTEGER NOT NULL,
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fat" REAL NOT NULL DEFAULT 0,
    "common" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "Food_category_idx" ON "Food"("category");
