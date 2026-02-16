-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastCompanyId" INTEGER,
ADD COLUMN     "lastContextHash" TEXT,
ADD COLUMN     "lastContextUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastOrgId" INTEGER;

-- CreateIndex
CREATE INDEX "User_lastOrgId_idx" ON "User"("lastOrgId");

-- CreateIndex
CREATE INDEX "User_lastCompanyId_idx" ON "User"("lastCompanyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastOrgId_fkey" FOREIGN KEY ("lastOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastCompanyId_fkey" FOREIGN KEY ("lastCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
