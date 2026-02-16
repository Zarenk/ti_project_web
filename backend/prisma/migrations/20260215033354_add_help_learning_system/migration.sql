-- CreateTable
CREATE TABLE "HelpLearningSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "queryNorm" TEXT NOT NULL,
    "section" TEXT,
    "matchFound" BOOLEAN NOT NULL,
    "matchedFaqId" TEXT,
    "confidence" DOUBLE PRECISION,
    "wasHelpful" BOOLEAN,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpLearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpSynonymRule" (
    "id" SERIAL NOT NULL,
    "canonical" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "section" TEXT,
    "autoLearned" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpSynonymRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpLearningSession_userId_timestamp_idx" ON "HelpLearningSession"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "HelpLearningSession_section_matchFound_idx" ON "HelpLearningSession"("section", "matchFound");

-- CreateIndex
CREATE INDEX "HelpLearningSession_timestamp_idx" ON "HelpLearningSession"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "HelpSynonymRule_canonical_synonym_section_key" ON "HelpSynonymRule"("canonical", "synonym", "section");

-- CreateIndex
CREATE INDEX "HelpSynonymRule_canonical_idx" ON "HelpSynonymRule"("canonical");

-- CreateIndex
CREATE INDEX "HelpSynonymRule_section_idx" ON "HelpSynonymRule"("section");
