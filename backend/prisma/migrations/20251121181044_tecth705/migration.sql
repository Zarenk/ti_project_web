-- CreateTable
CREATE TABLE "MonitoringAlertEvent" (
    "id" SERIAL NOT NULL,
    "alertId" INTEGER,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "alertType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringAlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitoringAlertEvent_organizationId_companyId_alertType_idx" ON "MonitoringAlertEvent"("organizationId", "companyId", "alertType");

-- CreateIndex
CREATE INDEX "MonitoringAlertEvent_alertId_idx" ON "MonitoringAlertEvent"("alertId");

-- AddForeignKey
ALTER TABLE "MonitoringAlertEvent" ADD CONSTRAINT "MonitoringAlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "MonitoringAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringAlertEvent" ADD CONSTRAINT "MonitoringAlertEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringAlertEvent" ADD CONSTRAINT "MonitoringAlertEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
