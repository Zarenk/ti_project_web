/*
  Warnings:

  - Made the column `paymentMethodId` on table `CashTransactionPaymentMethod` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CashTransactionPaymentMethod" DROP CONSTRAINT "CashTransactionPaymentMethod_paymentMethodId_fkey";

-- DropIndex
DROP INDEX "cash_registers_storeId_status_key";

-- AlterTable
ALTER TABLE "CashTransactionPaymentMethod" ALTER COLUMN "paymentMethodId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CashTransactionPaymentMethod" ADD CONSTRAINT "CashTransactionPaymentMethod_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
