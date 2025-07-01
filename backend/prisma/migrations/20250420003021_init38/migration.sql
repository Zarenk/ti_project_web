/*
  Warnings:

  - A unique constraint covering the columns `[entryDetailId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "entryDetailId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_entryDetailId_key" ON "Inventory"("entryDetailId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_entryDetailId_fkey" FOREIGN KEY ("entryDetailId") REFERENCES "EntryDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
