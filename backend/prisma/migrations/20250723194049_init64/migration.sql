-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Orders" DROP CONSTRAINT "Orders_salesId_fkey";

-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "payload" JSONB,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "salesId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
