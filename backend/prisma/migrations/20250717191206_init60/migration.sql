-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('POS', 'WEB');

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "source" "SaleSource" NOT NULL DEFAULT 'POS';

-- CreateIndex
CREATE INDEX "Sales_source_idx" ON "Sales"("source");
