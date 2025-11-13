-- Create table to store SUNAT PDFs per tenant
CREATE TABLE "SunatStoredPdf" (
    "id" SERIAL PRIMARY KEY,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "SunatStoredPdf_companyId_filename_key"
  ON "SunatStoredPdf"("companyId", "filename");
CREATE INDEX "SunatStoredPdf_organizationId_idx"
  ON "SunatStoredPdf"("organizationId");
CREATE INDEX "SunatStoredPdf_companyId_type_idx"
  ON "SunatStoredPdf"("companyId", "type");

ALTER TABLE "SunatStoredPdf"
  ADD CONSTRAINT "SunatStoredPdf_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SunatStoredPdf"
  ADD CONSTRAINT "SunatStoredPdf_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SunatStoredPdf"
  ADD CONSTRAINT "SunatStoredPdf_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
