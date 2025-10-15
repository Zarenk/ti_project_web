-- AlterTable
ALTER TABLE "cash_closures" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "cash_registers" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "cash_transactions" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE INDEX "cash_closures_organizationId_createdAt_idx" ON "cash_closures"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_registers_organizationId_storeId_idx" ON "cash_registers"("organizationId", "storeId");

-- CreateIndex
CREATE INDEX "cash_transactions_organizationId_createdAt_idx" ON "cash_transactions"("organizationId", "createdAt");
