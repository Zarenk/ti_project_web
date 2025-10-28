/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,documentNumber]` on the table `Provider` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AccEntry" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE INDEX "AccEntry_organizationId_idx" ON "AccEntry"("organizationId");

-- CreateIndex
CREATE INDEX "AccEntry_organizationId_companyId_idx" ON "AccEntry"("organizationId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_organizationId_documentNumber_key" ON "Provider"("organizationId", "documentNumber");

-- AddForeignKey
ALTER TABLE "AccEntry" ADD CONSTRAINT "AccEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccEntry" ADD CONSTRAINT "AccEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
