-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "correlativo" TEXT,
ADD COLUMN     "igvRate" DECIMAL(65,30) NOT NULL DEFAULT 0.18,
ADD COLUMN     "paymentTerm" "PaymentTerm" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "providerName" TEXT,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "totalGross" DECIMAL(65,30);
