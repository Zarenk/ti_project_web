/*
  Warnings:

  - A unique constraint covering the columns `[tipocomprobante,serie,nroCorrelativo]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tipocomprobante_serie_nroCorrelativo_key" ON "Invoice"("tipocomprobante", "serie", "nroCorrelativo");
