-- CreateTable
CREATE TABLE "CatalogCover" (
    "id" SERIAL NOT NULL,
    "imagePath" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogCover_isActive_idx" ON "CatalogCover"("isActive");
