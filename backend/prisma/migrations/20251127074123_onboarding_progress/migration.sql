-- CreateEnum
CREATE TYPE "DemoDataStatus" AS ENUM ('NONE', 'SEEDED', 'CLEANING');

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "companyProfile" JSONB,
    "storeSetup" JSONB,
    "sunatSetup" JSONB,
    "dataImport" JSONB,
    "demoStatus" "DemoDataStatus" NOT NULL DEFAULT 'NONE',
    "demoSeededAt" TIMESTAMP(3),
    "demoClearedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_organizationId_key" ON "OnboardingProgress"("organizationId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_updatedAt_idx" ON "OnboardingProgress"("updatedAt");

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
