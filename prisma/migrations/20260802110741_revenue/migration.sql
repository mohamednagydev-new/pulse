-- AlterTable
ALTER TABLE "Banner" ADD COLUMN "url" TEXT;

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "sponsorName" TEXT;
ALTER TABLE "Challenge" ADD COLUMN "sponsorUrl" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "affiliateLabel" TEXT;
ALTER TABLE "Recipe" ADD COLUMN "affiliateUrl" TEXT;
