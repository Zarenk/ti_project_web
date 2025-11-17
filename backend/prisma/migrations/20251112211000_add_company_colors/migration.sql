-- Add brand color columns for companies
ALTER TABLE "Company"
ADD COLUMN "primaryColor" TEXT,
ADD COLUMN "secondaryColor" TEXT;
