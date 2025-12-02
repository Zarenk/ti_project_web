/*
  Warnings:

  - Added the required column `companyId` to the `SubscriptionInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubscriptionInvoice" ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SunatTransmission" ADD COLUMN     "subscriptionInvoiceId" INTEGER;

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_companyId_idx" ON "SubscriptionInvoice"("companyId");

-- CreateIndex
CREATE INDEX "SunatTransmission_subscriptionInvoiceId_idx" ON "SunatTransmission"("subscriptionInvoiceId");

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SunatTransmission" ADD CONSTRAINT "SunatTransmission_subscriptionInvoiceId_fkey" FOREIGN KEY ("subscriptionInvoiceId") REFERENCES "SubscriptionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
