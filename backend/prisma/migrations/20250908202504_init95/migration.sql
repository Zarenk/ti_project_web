-- AlterTable
ALTER TABLE "SalePayment" ADD COLUMN     "cashTransactionId" INTEGER;

-- CreateIndex
CREATE INDEX "SalePayment_cashTransactionId_idx" ON "SalePayment"("cashTransactionId");

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "cash_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
