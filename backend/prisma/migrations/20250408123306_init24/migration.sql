-- CreateTable
CREATE TABLE "EntryDetailSeries" (
    "id" SERIAL NOT NULL,
    "entryDetailId" INTEGER NOT NULL,
    "serial" TEXT NOT NULL,

    CONSTRAINT "EntryDetailSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntryDetailSeries_serial_key" ON "EntryDetailSeries"("serial");

-- AddForeignKey
ALTER TABLE "EntryDetailSeries" ADD CONSTRAINT "EntryDetailSeries_entryDetailId_fkey" FOREIGN KEY ("entryDetailId") REFERENCES "EntryDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
