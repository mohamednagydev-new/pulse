-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_Partner" ("active", "address", "city", "contacts", "cover", "createdAt", "description", "descriptionAr", "featured", "id", "instagram", "logo", "mapUrl", "name", "nameAr", "order", "phone", "tagline", "taglineAr", "type", "views", "website", "whatsapp") SELECT "active", "address", "city", "contacts", "cover", "createdAt", "description", "descriptionAr", "featured", "id", "instagram", "logo", "mapUrl", "name", "nameAr", "order", "phone", "tagline", "taglineAr", "type", "views", "website", "whatsapp" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
