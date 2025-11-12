-- Create SunatTransmission table to track document sends
CREATE TABLE "SunatTransmission" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "environment" TEXT NOT NULL DEFAULT 'BETA',
    "documentType" TEXT NOT NULL,
    "serie" TEXT,
    "correlativo" TEXT,
    "zipFilePath" TEXT,
    "ticket" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "response" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "SunatTransmission_companyId_status_idx"
  ON "SunatTransmission"("companyId", "status");
CREATE INDEX "SunatTransmission_organizationId_idx"
  ON "SunatTransmission"("organizationId");

ALTER TABLE "SunatTransmission"
  ADD CONSTRAINT "SunatTransmission_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SunatTransmission"
  ADD CONSTRAINT "SunatTransmission_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
