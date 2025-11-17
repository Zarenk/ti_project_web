-- Add companyId to InvoiceSales and enforce per-company uniqueness
ALTER TABLE "InvoiceSales"
ADD COLUMN     "companyId" INTEGER;

UPDATE "InvoiceSales" AS i
SET "companyId" = s."companyId"
FROM "Sales" AS s
WHERE i."salesId" = s."id";

ALTER TABLE "InvoiceSales"
ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "InvoiceSales"
ADD CONSTRAINT "InvoiceSales_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "InvoiceSales_tipoComprobante_serie_nroCorrelativo_key";

CREATE UNIQUE INDEX "InvoiceSales_companyId_tipoComprobante_serie_nroCorrelativo_key"
ON "InvoiceSales"("companyId", "tipoComprobante", "serie", "nroCorrelativo");

-- Create table for configurable document sequences per company
CREATE TABLE "CompanyDocumentSequence" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "nextCorrelative" INTEGER NOT NULL DEFAULT 1,
    "correlativeLength" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CompanyDocumentSequence"
ADD CONSTRAINT "CompanyDocumentSequence_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CompanyDocumentSequence_companyId_documentType_key"
ON "CompanyDocumentSequence"("companyId", "documentType");
