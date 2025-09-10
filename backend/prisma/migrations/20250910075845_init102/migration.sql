-- CreateEnum
CREATE TYPE "EntryPaymentMethod" AS ENUM ('CASH', 'CREDIT');

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "paymentMethod" "EntryPaymentMethod" NOT NULL DEFAULT 'CASH';
