/*
  Warnings:

  - A unique constraint covering the columns `[fecha,moneda,organizationId]` on the table `TipoCambio` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TipoCambio_fecha_moneda_idx";

-- DropIndex
DROP INDEX "TipoCambio_fecha_moneda_key";

-- AlterTable
ALTER TABLE "TipoCambio" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE INDEX "TipoCambio_fecha_moneda_organizationId_idx" ON "TipoCambio"("fecha", "moneda", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCambio_fecha_moneda_organizationId_key" ON "TipoCambio"("fecha", "moneda", "organizationId");

-- AddForeignKey
ALTER TABLE "TipoCambio" ADD CONSTRAINT "TipoCambio_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
