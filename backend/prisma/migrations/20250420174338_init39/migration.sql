/*
  Warnings:

  - Added the required column `priceInSoles` to the `EntryDetail` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "tipoCambioId" INTEGER;

-- AlterTable
ALTER TABLE "EntryDetail" ADD COLUMN     "priceInSoles" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "TipoCambio" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "moneda" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoCambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TipoCambio_fecha_moneda_idx" ON "TipoCambio"("fecha", "moneda");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCambio_fecha_moneda_key" ON "TipoCambio"("fecha", "moneda");

-- CreateIndex
CREATE INDEX "Entry_storeId_idx" ON "Entry"("storeId");

-- CreateIndex
CREATE INDEX "Entry_userId_idx" ON "Entry"("userId");

-- CreateIndex
CREATE INDEX "Entry_providerId_idx" ON "Entry"("providerId");

-- CreateIndex
CREATE INDEX "Entry_date_idx" ON "Entry"("date");

-- CreateIndex
CREATE INDEX "EntryDetail_entryId_idx" ON "EntryDetail"("entryId");

-- CreateIndex
CREATE INDEX "EntryDetail_productId_idx" ON "EntryDetail"("productId");

-- CreateIndex
CREATE INDEX "Inventory_entryDetailId_idx" ON "Inventory"("entryDetailId");

-- CreateIndex
CREATE INDEX "InventoryHistory_inventoryId_idx" ON "InventoryHistory"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryHistory_userId_idx" ON "InventoryHistory"("userId");

-- CreateIndex
CREATE INDEX "InventoryHistory_createdAt_idx" ON "InventoryHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_entryId_idx" ON "Invoice"("entryId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Sales_userId_idx" ON "Sales"("userId");

-- CreateIndex
CREATE INDEX "Sales_storeId_idx" ON "Sales"("storeId");

-- CreateIndex
CREATE INDEX "Sales_clientId_idx" ON "Sales"("clientId");

-- CreateIndex
CREATE INDEX "Sales_createdAt_idx" ON "Sales"("createdAt");

-- CreateIndex
CREATE INDEX "SalesDetail_salesId_idx" ON "SalesDetail"("salesId");

-- CreateIndex
CREATE INDEX "SalesDetail_productId_idx" ON "SalesDetail"("productId");

-- CreateIndex
CREATE INDEX "SalesDetail_entryDetailId_idx" ON "SalesDetail"("entryDetailId");

-- CreateIndex
CREATE INDEX "SalesDetail_storeOnInventoryId_idx" ON "SalesDetail"("storeOnInventoryId");

-- CreateIndex
CREATE INDEX "StoreOnInventory_inventoryId_idx" ON "StoreOnInventory"("inventoryId");

-- CreateIndex
CREATE INDEX "StoreOnInventory_storeId_idx" ON "StoreOnInventory"("storeId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_tipoCambioId_fkey" FOREIGN KEY ("tipoCambioId") REFERENCES "TipoCambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
