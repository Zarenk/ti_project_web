-- Add SUNAT display fields to Company
ALTER TABLE "Company"
  ADD COLUMN "sunatBusinessName" TEXT,
  ADD COLUMN "sunatAddress" TEXT,
  ADD COLUMN "sunatPhone" TEXT;
