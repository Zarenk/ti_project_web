/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,name]` on the table `Brand` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Brand_name_key";

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "guiaCorrelativo" TEXT,
ADD COLUMN     "guiaDestinatario" TEXT,
ADD COLUMN     "guiaFechaEmision" TEXT,
ADD COLUMN     "guiaFechaEntregaTransportista" TEXT,
ADD COLUMN     "guiaMotivoTraslado" TEXT,
ADD COLUMN     "guiaPesoBrutoTotal" TEXT,
ADD COLUMN     "guiaPesoBrutoUnidad" TEXT,
ADD COLUMN     "guiaPuntoLlegada" TEXT,
ADD COLUMN     "guiaPuntoPartida" TEXT,
ADD COLUMN     "guiaSerie" TEXT,
ADD COLUMN     "guiaTransportista" TEXT;

-- AlterTable
ALTER TABLE "SunatTransmission" ADD COLUMN     "cdrCode" TEXT,
ADD COLUMN     "cdrDescription" TEXT,
ADD COLUMN     "cdrFilePath" TEXT,
ADD COLUMN     "xmlFilePath" TEXT;

-- CreateIndex
CREATE INDEX "Brand_organizationId_idx" ON "Brand"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_organizationId_name_key" ON "Brand"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
