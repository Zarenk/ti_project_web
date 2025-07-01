-- CreateTable
CREATE TABLE "InvoiceSales" (
    "id" SERIAL NOT NULL,
    "salesId" INTEGER NOT NULL,
    "serie" TEXT NOT NULL,
    "nroCorrelativo" TEXT NOT NULL,
    "tipoComprobante" TEXT NOT NULL,
    "tipoMoneda" TEXT,
    "total" DOUBLE PRECISION,
    "fechaEmision" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSales_salesId_key" ON "InvoiceSales"("salesId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSales_tipoComprobante_serie_nroCorrelativo_key" ON "InvoiceSales"("tipoComprobante", "serie", "nroCorrelativo");

-- AddForeignKey
ALTER TABLE "InvoiceSales" ADD CONSTRAINT "InvoiceSales_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
