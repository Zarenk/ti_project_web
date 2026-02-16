-- CreateEnum
CREATE TYPE "BusinessVertical" AS ENUM ('GENERAL', 'RESTAURANTS', 'RETAIL', 'SERVICES', 'MANUFACTURING');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "businessVertical" "BusinessVertical" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Organization_businessVertical_idx" ON "Organization"("businessVertical");

-- CreateTable
CREATE TABLE "VerticalChangeAudit" (
    "id" SERIAL PRIMARY KEY,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER,
    "oldVertical" "BusinessVertical" NOT NULL,
    "newVertical" "BusinessVertical" NOT NULL,
    "changeReason" TEXT,
    "warningsJson" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VerticalRollbackSnapshot" (
    "id" TEXT PRIMARY KEY,
    "organizationId" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "VerticalChangeAudit_organizationId_idx" ON "VerticalChangeAudit"("organizationId");
CREATE INDEX "VerticalChangeAudit_createdAt_idx" ON "VerticalChangeAudit"("createdAt");
CREATE INDEX "VerticalRollbackSnapshot_organizationId_idx" ON "VerticalRollbackSnapshot"("organizationId");
CREATE INDEX "VerticalRollbackSnapshot_expiresAt_idx" ON "VerticalRollbackSnapshot"("expiresAt");

-- AddForeignKey
ALTER TABLE "VerticalChangeAudit"
  ADD CONSTRAINT "VerticalChangeAudit_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VerticalChangeAudit"
  ADD CONSTRAINT "VerticalChangeAudit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VerticalRollbackSnapshot"
  ADD CONSTRAINT "VerticalRollbackSnapshot_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
