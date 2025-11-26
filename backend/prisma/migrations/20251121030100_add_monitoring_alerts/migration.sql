CREATE TABLE "MonitoringAlert" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "alertType" TEXT NOT NULL,
    "providerName" TEXT,
    "entityType" TEXT,
    "entityId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "identifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitoringAlert_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MonitoringAlert_identifier_key" UNIQUE ("identifier")
);

CREATE INDEX "MonitoringAlert_alertType_status_idx"
  ON "MonitoringAlert" ("alertType", "status");

CREATE INDEX "MonitoringAlert_org_company_status_idx"
  ON "MonitoringAlert" ("organizationId", "companyId", "status");

ALTER TABLE "MonitoringAlert"
  ADD CONSTRAINT "MonitoringAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MonitoringAlert"
  ADD CONSTRAINT "MonitoringAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
