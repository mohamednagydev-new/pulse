-- AlterTable
ALTER TABLE "PartnerProduct" ADD COLUMN "oldPriceAmount" REAL;
ALTER TABLE "PartnerProduct" ADD COLUMN "priceAmount" REAL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "country" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FitEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'class',
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "image" TEXT,
    "city" TEXT,
    "venue" TEXT,
    "venueAr" TEXT,
    "mapUrl" TEXT,
    "date" TEXT NOT NULL,
    "time" TEXT,
    "country" TEXT NOT NULL DEFAULT 'EG',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "priceAmount" REAL,
    "price" TEXT,
    "url" TEXT,
    "whatsapp" TEXT,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FitEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FitEvent" ("active", "city", "contacts", "createdAt", "date", "description", "descriptionAr", "featured", "id", "image", "kind", "mapUrl", "partnerId", "price", "sponsored", "time", "title", "titleAr", "url", "venue", "venueAr", "views", "whatsapp") SELECT "active", "city", "contacts", "createdAt", "date", "description", "descriptionAr", "featured", "id", "image", "kind", "mapUrl", "partnerId", "price", "sponsored", "time", "title", "titleAr", "url", "venue", "venueAr", "views", "whatsapp" FROM "FitEvent";
DROP TABLE "FitEvent";
ALTER TABLE "new_FitEvent" RENAME TO "FitEvent";
CREATE INDEX "FitEvent_active_date_idx" ON "FitEvent"("active", "date");
CREATE TABLE "new_Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'store',
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "tagline" TEXT,
    "taglineAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "logo" TEXT,
    "cover" TEXT,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "mapUrl" TEXT,
    "lat" REAL,
    "lng" REAL,
    "facilities" TEXT,
    "hours" TEXT,
    "ladiesOnly" BOOLEAN NOT NULL DEFAULT false,
    "ladiesHours" TEXT,
    "country" TEXT NOT NULL DEFAULT 'EG',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "priceFromAmount" REAL,
    "priceFrom" TEXT,
    "priceFromAr" TEXT,
    "gallery" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Partner" ("active", "address", "city", "contacts", "cover", "createdAt", "description", "descriptionAr", "facilities", "featured", "gallery", "hours", "id", "instagram", "ladiesHours", "ladiesOnly", "lat", "lng", "logo", "mapUrl", "name", "nameAr", "order", "phone", "priceFrom", "priceFromAr", "tagline", "taglineAr", "type", "views", "website", "whatsapp") SELECT "active", "address", "city", "contacts", "cover", "createdAt", "description", "descriptionAr", "facilities", "featured", "gallery", "hours", "id", "instagram", "ladiesHours", "ladiesOnly", "lat", "lng", "logo", "mapUrl", "name", "nameAr", "order", "phone", "priceFrom", "priceFromAr", "tagline", "taglineAr", "type", "views", "website", "whatsapp" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
