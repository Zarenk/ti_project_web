/*
  Warnings:

  - A unique constraint covering the columns `[productId,storeId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storeId` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "storeId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_storeId_key" ON "Inventory"("productId", "storeId");
