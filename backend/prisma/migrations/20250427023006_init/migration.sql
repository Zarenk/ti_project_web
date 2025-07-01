-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_paymentMethodId_fkey";

-- CreateTable
CREATE TABLE "CashTransactionPaymentMethod" (
    "id" SERIAL NOT NULL,
    "cashTransactionId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER,

    CONSTRAINT "CashTransactionPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashTransactionPaymentMethod" ADD CONSTRAINT "CashTransactionPaymentMethod_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "cash_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransactionPaymentMethod" ADD CONSTRAINT "CashTransactionPaymentMethod_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
