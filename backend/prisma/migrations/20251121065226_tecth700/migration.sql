-- AlterTable
ALTER TABLE "MonitoringAlert" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "MonitoringAlert_org_company_status_idx" RENAME TO "MonitoringAlert_organizationId_companyId_status_idx";
