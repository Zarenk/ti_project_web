/*
  Warnings:

  - You are about to drop the column `stock` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the `_InventoryToStore` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_InventoryToStore" DROP CONSTRAINT "_InventoryToStore_A_fkey";

-- DropForeignKey
ALTER TABLE "_InventoryToStore" DROP CONSTRAINT "_InventoryToStore_B_fkey";

-- DropIndex
DROP INDEX "Inventory_productId_key";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "stock";

-- DropTable
DROP TABLE "_InventoryToStore";

-- CreateTable
CREATE TABLE "StoreOnInventory" (
    "id" SERIAL NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOnInventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoreOnInventory" ADD CONSTRAINT "StoreOnInventory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOnInventory" ADD CONSTRAINT "StoreOnInventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
