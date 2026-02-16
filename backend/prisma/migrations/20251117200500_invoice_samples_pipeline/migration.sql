-- Create InvoiceSample table
CREATE TABLE "InvoiceSample" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "entryId" INTEGER,
    "invoiceTemplateId" INTEGER,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" BIGINT,
    "sha256" TEXT NOT NULL,
    "extractionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractionResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSample_pkey" PRIMARY KEY ("id")
);

-- Create InvoiceExtractionLog table
CREATE TABLE "InvoiceExtractionLog" (
    "id" SERIAL NOT NULL,
    "sampleId" INTEGER NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceExtractionLog_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "InvoiceSample"
  ADD CONSTRAINT "InvoiceSample_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceSample"
  ADD CONSTRAINT "InvoiceSample_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceSample"
  ADD CONSTRAINT "InvoiceSample_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceSample"
  ADD CONSTRAINT "InvoiceSample_invoiceTemplateId_fkey"
    FOREIGN KEY ("invoiceTemplateId") REFERENCES "InvoiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceExtractionLog"
  ADD CONSTRAINT "InvoiceExtractionLog_sampleId_fkey"
    FOREIGN KEY ("sampleId") REFERENCES "InvoiceSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "InvoiceSample_organizationId_companyId_idx" ON "InvoiceSample"("organizationId", "companyId");
CREATE INDEX "InvoiceSample_entryId_idx" ON "InvoiceSample"("entryId");
CREATE INDEX "InvoiceSample_invoiceTemplateId_idx" ON "InvoiceSample"("invoiceTemplateId");
CREATE UNIQUE INDEX "InvoiceSample_hash_org_unique" ON "InvoiceSample"("sha256", "organizationId");

CREATE INDEX "InvoiceExtractionLog_sampleId_level_idx" ON "InvoiceExtractionLog"("sampleId", "level");
