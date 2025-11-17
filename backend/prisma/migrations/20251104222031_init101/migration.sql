-- DropIndex
DROP INDEX "CatalogCover_isActive_idx";

-- AlterTable
ALTER TABLE "CatalogCover" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE INDEX "CatalogCover_organizationId_companyId_isActive_idx" ON "CatalogCover"("organizationId", "companyId", "isActive");

-- AddForeignKey
ALTER TABLE "CatalogCover" ADD CONSTRAINT "CatalogCover_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogCover" ADD CONSTRAINT "CatalogCover_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
