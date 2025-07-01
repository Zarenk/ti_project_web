/*
  Warnings:

  - You are about to drop the column `saleId` on the `SalePayment` table. All the data in the column will be lost.
  - Added the required column `salesId` to the `SalePayment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SalePayment" DROP CONSTRAINT "SalePayment_saleId_fkey";

-- DropIndex
DROP INDEX "SalePayment_saleId_idx";

-- AlterTable
ALTER TABLE "SalePayment" DROP COLUMN "saleId",
ADD COLUMN     "salesId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "SalePayment_salesId_idx" ON "SalePayment"("salesId");

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
