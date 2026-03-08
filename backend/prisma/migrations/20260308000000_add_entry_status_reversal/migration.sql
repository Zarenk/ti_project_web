-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'POSTED';
ALTER TABLE "Entry" ADD COLUMN "postedAt" TIMESTAMP(3);
ALTER TABLE "Entry" ADD COLUMN "canceledAt" TIMESTAMP(3);
ALTER TABLE "Entry" ADD COLUMN "canceledByEntryId" INTEGER;
ALTER TABLE "Entry" ADD COLUMN "reversalEntryId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Entry_reversalEntryId_key" ON "Entry"("reversalEntryId");

-- CreateIndex
CREATE INDEX "Entry_organizationId_status_idx" ON "Entry"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_reversalEntryId_fkey" FOREIGN KEY ("reversalEntryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
