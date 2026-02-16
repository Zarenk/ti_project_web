-- DropIndex
DROP INDEX "Provider_documentNumber_key";

-- DropIndex
DROP INDEX "Store_name_key";

-- DropIndex
DROP INDEX "Store_organizationId_name_idx";

-- DropIndex
DROP INDEX "cash_registers_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Store_organizationId_name_key" ON "Store"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_storeId_name_key" ON "cash_registers"("storeId", "name");
