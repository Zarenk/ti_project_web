-- DropIndex
DROP INDEX "Invoice_tipoComprobante_serie_nroCorrelativo_key";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "tipoComprobante" DROP NOT NULL;
