/*
  Warnings:

  - A unique constraint covering the columns `[referenceId]` on the table `Entry` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "referenceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Entry_referenceId_key" ON "Entry"("referenceId");
