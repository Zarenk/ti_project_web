/*
  Warnings:

  - A unique constraint covering the columns `[referenceId]` on the table `Sales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "referenceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sales_referenceId_key" ON "Sales"("referenceId");
