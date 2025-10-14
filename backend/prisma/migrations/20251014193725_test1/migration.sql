/*
  Warnings:

  - You are about to drop the column `next_opening_balance` on the `cash_closures` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cash_closures" DROP COLUMN "next_opening_balance",
ADD COLUMN     "nextOpeningBalance" DECIMAL(65,30);
