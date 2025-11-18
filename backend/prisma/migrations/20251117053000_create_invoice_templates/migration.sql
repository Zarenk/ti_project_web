-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "providerId" INTEGER,
    "providerName" TEXT,
    "documentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "checksum" TEXT,
    "regexRules" JSONB,
    "fieldMappings" JSONB,
    "extractionHints" JSONB,
    "sampleFilename" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoiceTemplate"
ADD CONSTRAINT "InvoiceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceTemplate"
ADD CONSTRAINT "InvoiceTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceTemplate"
ADD CONSTRAINT "InvoiceTemplate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceTemplate"
ADD CONSTRAINT "InvoiceTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceTemplate"
ADD CONSTRAINT "InvoiceTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "InvoiceTemplate_organizationId_companyId_idx" ON "InvoiceTemplate"("organizationId", "companyId");
CREATE INDEX "InvoiceTemplate_providerId_idx" ON "InvoiceTemplate"("providerId");
CREATE INDEX "InvoiceTemplate_documentType_idx" ON "InvoiceTemplate"("documentType");
CREATE UNIQUE INDEX "InvoiceTemplate_org_company_provider_type_version_key" ON "InvoiceTemplate"("organizationId", "companyId", "providerId", "documentType", "version");
