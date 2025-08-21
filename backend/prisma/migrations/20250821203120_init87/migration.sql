/*
  Warnings:

  - You are about to drop the column `nature` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Account` table. All the data in the column will be lost.
  - Added the required column `level` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `TaxCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sunatOperacionType` to the `TaxCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sunatTributoCode` to the `TaxCode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_accountId_fkey";

-- DropIndex
DROP INDEX "Account_code_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "nature",
DROP COLUMN "type",
ADD COLUMN     "isPosting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TaxCode" ADD COLUMN     "contraAccountId" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "sunatOperacionType" TEXT NOT NULL,
ADD COLUMN     "sunatTributoCode" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "TaxCode" ADD CONSTRAINT "TaxCode_contraAccountId_fkey" FOREIGN KEY ("contraAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
