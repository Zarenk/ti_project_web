-- AlterTable
ALTER TABLE "AccEntry" ADD COLUMN     "correlativo" TEXT,
ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "providerId" INTEGER,
ADD COLUMN     "serie" TEXT;

-- CreateIndex
CREATE INDEX "AccEntry_providerId_idx" ON "AccEntry"("providerId");

-- AddForeignKey
ALTER TABLE "AccEntry" ADD CONSTRAINT "AccEntry_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
