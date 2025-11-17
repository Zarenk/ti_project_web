/*
  Warnings:

  - A unique constraint covering the columns `[tenantKey]` on the table `SiteSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
CREATE SEQUENCE sitesettings_id_seq;
ALTER TABLE "SiteSettings" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "tenantKey" TEXT NOT NULL DEFAULT 'org:0|company:0',
ALTER COLUMN "id" SET DEFAULT nextval('sitesettings_id_seq');
ALTER SEQUENCE sitesettings_id_seq OWNED BY "SiteSettings"."id";

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_tenantKey_key" ON "SiteSettings"("tenantKey");

-- CreateIndex
CREATE INDEX "SiteSettings_organizationId_idx" ON "SiteSettings"("organizationId");

-- CreateIndex
CREATE INDEX "SiteSettings_companyId_idx" ON "SiteSettings"("companyId");

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
