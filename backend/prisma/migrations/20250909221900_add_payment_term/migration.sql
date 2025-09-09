-- CreateEnum
CREATE TYPE "PaymentTerm" AS ENUM ('CASH', 'CREDIT');

-- AlterTable
ALTER TABLE "Entry"
    ADD COLUMN     "paymentTerm" "PaymentTerm" NOT NULL DEFAULT 'CASH',
    ADD COLUMN     "serie" TEXT,
    ADD COLUMN     "correlativo" TEXT,
    ADD COLUMN     "providerName" TEXT,
    ADD COLUMN     "totalGross" DECIMAL,
    ADD COLUMN     "igvRate" DECIMAL DEFAULT 0.18;
