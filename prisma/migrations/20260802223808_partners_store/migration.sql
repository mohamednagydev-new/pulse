-- CreateTable
CREATE TABLE "Partner" (
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
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PartnerProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'supplements',
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "image" TEXT,
    "price" TEXT,
    "oldPrice" TEXT,
    "badge" TEXT,
    "url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerProduct_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PartnerProduct_category_idx" ON "PartnerProduct"("category");
