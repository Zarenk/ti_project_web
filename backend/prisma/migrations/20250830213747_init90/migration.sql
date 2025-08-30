-- CreateEnum
CREATE TYPE "AccEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "AccPeriodStatus" AS ENUM ('OPEN', 'LOCKED');

-- CreateTable
CREATE TABLE "AccPeriod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AccPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccEntry" (
    "id" SERIAL NOT NULL,
    "periodId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AccEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "totalDebit" DOUBLE PRECISION NOT NULL,
    "totalCredit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccEntryLine" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "account" TEXT NOT NULL,
    "description" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AccEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccPeriod_name_key" ON "AccPeriod"("name");

-- CreateIndex
CREATE INDEX "AccEntry_periodId_idx" ON "AccEntry"("periodId");

-- CreateIndex
CREATE INDEX "AccEntryLine_entryId_idx" ON "AccEntryLine"("entryId");

-- AddForeignKey
ALTER TABLE "AccEntry" ADD CONSTRAINT "AccEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccEntryLine" ADD CONSTRAINT "AccEntryLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AccEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
