-- AlterTable
ALTER TABLE "SubscriptionInvoice" ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionCode" TEXT,
    "rate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxRate_countryCode_regionCode_idx" ON "TaxRate"("countryCode", "regionCode");

-- CreateIndex
CREATE INDEX "TaxRate_isDefault_idx" ON "TaxRate"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_countryCode_regionCode_key" ON "TaxRate"("countryCode", "regionCode");
