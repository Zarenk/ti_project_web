/*
  Warnings:

  - You are about to drop the column `tipocomprobante` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tipoComprobante,serie,nroCorrelativo]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tipoComprobante` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Invoice_tipocomprobante_serie_nroCorrelativo_key";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "tipocomprobante",
ADD COLUMN     "tipoComprobante" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tipoComprobante_serie_nroCorrelativo_key" ON "Invoice"("tipoComprobante", "serie", "nroCorrelativo");
