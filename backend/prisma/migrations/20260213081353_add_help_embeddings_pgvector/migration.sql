-- CreateTable
CREATE TABLE "HelpEmbedding" (
    "id" SERIAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpEmbedding_section_idx" ON "HelpEmbedding"("section");

-- CreateIndex
CREATE UNIQUE INDEX "HelpEmbedding_sourceType_sourceId_key" ON "HelpEmbedding"("sourceType", "sourceId");
