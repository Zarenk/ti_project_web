/*
  Warnings:

  - You are about to drop the column `entryDetailId` on the `Inventory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_entryDetailId_fkey";

-- DropIndex
DROP INDEX "Inventory_entryDetailId_idx";

-- DropIndex
DROP INDEX "Inventory_entryDetailId_key";

-- AlterTable
ALTER TABLE "EntryDetail" ADD COLUMN     "inventoryId" INTEGER;

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "entryDetailId";

-- AddForeignKey
ALTER TABLE "EntryDetail" ADD CONSTRAINT "EntryDetail_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
