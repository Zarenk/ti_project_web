-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE INDEX "Orders_organizationId_createdAt_idx" ON "Orders"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
