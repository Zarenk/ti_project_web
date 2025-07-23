-- CreateTable
CREATE TABLE "Orders" (
    "id" SERIAL NOT NULL,
    "salesId" INTEGER NOT NULL,
    "shippingName" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Orders_salesId_key" ON "Orders"("salesId");

-- CreateIndex
CREATE INDEX "Orders_salesId_idx" ON "Orders"("salesId");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
