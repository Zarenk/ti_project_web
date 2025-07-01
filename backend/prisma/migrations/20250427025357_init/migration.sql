/*
  Warnings:

  - You are about to drop the column `paymentMethodId` on the `cash_transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cash_transactions" DROP COLUMN "paymentMethodId";
