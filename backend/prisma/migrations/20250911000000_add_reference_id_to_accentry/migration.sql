-- Add optional referenceId field to AccEntry
ALTER TABLE "AccEntry" ADD COLUMN "referenceId" TEXT;
CREATE UNIQUE INDEX "AccEntry_referenceId_key" ON "AccEntry"("referenceId");
