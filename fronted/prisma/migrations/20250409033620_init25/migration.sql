-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "serie" TEXT,
    "nroCorrelativo" TEXT,
    "comprobante" TEXT,
    "tipoMoneda" TEXT,
    "total" DOUBLE PRECISION,
    "fechaEmision" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_entryId_key" ON "Invoice"("entryId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
