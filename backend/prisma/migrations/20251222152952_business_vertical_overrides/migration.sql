-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "productSchemaEnforced" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "extraAttributes" JSONB,
ADD COLUMN     "isVerticalMigrated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrganizationVerticalOverride" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "configJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationVerticalOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationVerticalOverride_organizationId_key" ON "OrganizationVerticalOverride"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationVerticalOverride" ADD CONSTRAINT "OrganizationVerticalOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
