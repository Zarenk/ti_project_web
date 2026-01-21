-- Add organization scoping for brands
ALTER TABLE "Brand" ADD COLUMN "organizationId" INTEGER;

-- Drop global unique index on name so brands can repeat across orgs
DROP INDEX IF EXISTS "Brand_name_key";

-- Add org scoping and indexes
CREATE UNIQUE INDEX "Brand_organizationId_name_key" ON "Brand"("organizationId", "name");
CREATE INDEX "Brand_organizationId_idx" ON "Brand"("organizationId");

-- Foreign key to Organization
ALTER TABLE "Brand"
  ADD CONSTRAINT "Brand_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
