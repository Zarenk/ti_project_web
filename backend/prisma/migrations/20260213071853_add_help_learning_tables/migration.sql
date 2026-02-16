-- CreateEnum
CREATE TYPE "HelpMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "HelpMessageSource" AS ENUM ('STATIC', 'AI', 'PROMOTED');

-- CreateEnum
CREATE TYPE "HelpFeedback" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "HelpCandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "HelpConversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "role" "HelpMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "HelpMessageSource",
    "section" TEXT,
    "route" TEXT,
    "score" DOUBLE PRECISION,
    "feedback" "HelpFeedback",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpKBCandidate" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "questionNorm" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "positiveVotes" INTEGER NOT NULL DEFAULT 0,
    "negativeVotes" INTEGER NOT NULL DEFAULT 0,
    "status" "HelpCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "HelpKBCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpConversation_userId_idx" ON "HelpConversation"("userId");

-- CreateIndex
CREATE INDEX "HelpMessage_conversationId_idx" ON "HelpMessage"("conversationId");

-- CreateIndex
CREATE INDEX "HelpMessage_feedback_idx" ON "HelpMessage"("feedback");

-- CreateIndex
CREATE INDEX "HelpMessage_source_idx" ON "HelpMessage"("source");

-- CreateIndex
CREATE INDEX "HelpKBCandidate_status_idx" ON "HelpKBCandidate"("status");

-- CreateIndex
CREATE INDEX "HelpKBCandidate_section_idx" ON "HelpKBCandidate"("section");

-- CreateIndex
CREATE UNIQUE INDEX "HelpKBCandidate_questionNorm_section_key" ON "HelpKBCandidate"("questionNorm", "section");

-- AddForeignKey
ALTER TABLE "HelpConversation" ADD CONSTRAINT "HelpConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpMessage" ADD CONSTRAINT "HelpMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "HelpConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpKBCandidate" ADD CONSTRAINT "HelpKBCandidate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
