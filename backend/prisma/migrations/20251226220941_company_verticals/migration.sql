-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "businessVertical" "BusinessVertical" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "productSchemaEnforced" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CompanyVerticalOverride" (
    "companyId" INTEGER NOT NULL,
    "configJson" JSONB,

    CONSTRAINT "CompanyVerticalOverride_pkey" PRIMARY KEY ("companyId")
);

-- CreateTable
CREATE TABLE "CompanyVerticalChangeAudit" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER,
    "oldVertical" "BusinessVertical" NOT NULL,
    "newVertical" "BusinessVertical" NOT NULL,
    "changeReason" TEXT,
    "warningsJson" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyVerticalChangeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyVerticalRollbackSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyVerticalRollbackSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyVerticalChangeAudit_companyId_idx" ON "CompanyVerticalChangeAudit"("companyId");

-- CreateIndex
CREATE INDEX "CompanyVerticalChangeAudit_organizationId_idx" ON "CompanyVerticalChangeAudit"("organizationId");

-- CreateIndex
CREATE INDEX "CompanyVerticalChangeAudit_createdAt_idx" ON "CompanyVerticalChangeAudit"("createdAt");

-- CreateIndex
CREATE INDEX "CompanyVerticalRollbackSnapshot_companyId_idx" ON "CompanyVerticalRollbackSnapshot"("companyId");

-- CreateIndex
CREATE INDEX "CompanyVerticalRollbackSnapshot_organizationId_idx" ON "CompanyVerticalRollbackSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "CompanyVerticalRollbackSnapshot_expiresAt_idx" ON "CompanyVerticalRollbackSnapshot"("expiresAt");

-- AddForeignKey
ALTER TABLE "CompanyVerticalOverride" ADD CONSTRAINT "CompanyVerticalOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerticalChangeAudit" ADD CONSTRAINT "CompanyVerticalChangeAudit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerticalChangeAudit" ADD CONSTRAINT "CompanyVerticalChangeAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerticalChangeAudit" ADD CONSTRAINT "CompanyVerticalChangeAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerticalRollbackSnapshot" ADD CONSTRAINT "CompanyVerticalRollbackSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerticalRollbackSnapshot" ADD CONSTRAINT "CompanyVerticalRollbackSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
