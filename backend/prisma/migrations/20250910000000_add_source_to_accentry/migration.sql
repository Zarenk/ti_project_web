-- Add optional source fields to AccEntry
ALTER TABLE "AccEntry" ADD COLUMN "source" TEXT;
ALTER TABLE "AccEntry" ADD COLUMN "sourceId" INTEGER;
