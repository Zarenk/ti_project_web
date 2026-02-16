-- CreateEnum
CREATE TYPE "OrganizationDataExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrganizationCleanupStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "OrganizationDataExport" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "requestedBy" INTEGER,
    "status" "OrganizationDataExportStatus" NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cleanupStatus" "OrganizationCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "cleanupCompletedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationDataExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationDataExport_organizationId_status_idx" ON "OrganizationDataExport"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "OrganizationDataExport" ADD CONSTRAINT "OrganizationDataExport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDataExport" ADD CONSTRAINT "OrganizationDataExport_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
