/*
  Warnings:

  - You are about to drop the column `type` on the `Journal` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Journal` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_journalId_fkey";

-- DropIndex
DROP INDEX "Journal_type_idx";

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "journalId" INTEGER;

-- AlterTable
ALTER TABLE "Journal" DROP COLUMN "type",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Entry_journalId_idx" ON "Entry"("journalId");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
