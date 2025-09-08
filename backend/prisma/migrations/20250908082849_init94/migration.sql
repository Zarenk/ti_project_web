-- CreateTable
CREATE TABLE "Keyword" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Keyword_name_idx" ON "Keyword"("name");

-- CreateIndex
CREATE INDEX "Keyword_brandId_idx" ON "Keyword"("brandId");

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
