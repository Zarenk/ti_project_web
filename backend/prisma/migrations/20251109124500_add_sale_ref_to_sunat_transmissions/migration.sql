-- Link SUNAT transmissions with the originating sale
ALTER TABLE "SunatTransmission"
  ADD COLUMN "saleId" INTEGER;

CREATE INDEX IF NOT EXISTS "SunatTransmission_saleId_idx"
  ON "SunatTransmission"("saleId");

ALTER TABLE "SunatTransmission"
  ADD CONSTRAINT "SunatTransmission_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
