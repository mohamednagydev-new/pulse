-- AlterTable
ALTER TABLE "Article" ADD COLUMN "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "FeaturedItem" ADD COLUMN "url" TEXT;
ALTER TABLE "FeaturedItem" ADD COLUMN "videoId" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "videoUrl" TEXT;
