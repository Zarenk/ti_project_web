/*
  Warnings:

  - You are about to drop the column `comprobante` on the `Invoice` table. All the data in the column will be lost.
  - Made the column `serie` on table `Invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nroCorrelativo` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "comprobante",
ADD COLUMN     "tipocomprobante" TEXT,
ALTER COLUMN "serie" SET NOT NULL,
ALTER COLUMN "nroCorrelativo" SET NOT NULL;
