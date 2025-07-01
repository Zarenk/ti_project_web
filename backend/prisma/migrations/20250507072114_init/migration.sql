-- CreateTable
CREATE TABLE "ShippingGuide" (
    "id" SERIAL NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativo" TEXT NOT NULL,
    "motivoTraslado" TEXT NOT NULL,
    "fechaTraslado" TIMESTAMP(3) NOT NULL,
    "puntoPartida" TEXT NOT NULL,
    "puntoLlegada" TEXT NOT NULL,
    "transportistaTipoDocumento" TEXT NOT NULL,
    "transportistaNumeroDocumento" TEXT NOT NULL,
    "transportistaRazonSocial" TEXT NOT NULL,
    "transportistaNumeroPlaca" TEXT NOT NULL,
    "destinatarioTipoDocumento" TEXT NOT NULL,
    "destinatarioNumeroDocumento" TEXT NOT NULL,
    "destinatarioRazonSocial" TEXT NOT NULL,
    "xmlName" TEXT,
    "zipName" TEXT,
    "cdrAceptado" BOOLEAN NOT NULL,
    "cdrCode" TEXT,
    "cdrDescription" TEXT,
    "ventaId" INTEGER,
    "entryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingGuide_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShippingGuide" ADD CONSTRAINT "ShippingGuide_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingGuide" ADD CONSTRAINT "ShippingGuide_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
