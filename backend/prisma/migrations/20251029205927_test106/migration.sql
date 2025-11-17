/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,serial]` on the table `EntryDetailSeries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "EntryDetailSeries_serial_key";

-- AlterTable
ALTER TABLE "EntryDetailSeries" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE INDEX "EntryDetailSeries_organizationId_serial_idx" ON "EntryDetailSeries"("organizationId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "EntryDetailSeries_organizationId_serial_key" ON "EntryDetailSeries"("organizationId", "serial");

-- AddForeignKey
ALTER TABLE "EntryDetailSeries" ADD CONSTRAINT "EntryDetailSeries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
