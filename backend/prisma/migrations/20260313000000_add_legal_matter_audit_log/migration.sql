-- CreateTable
CREATE TABLE "LegalMatterAuditLog" (
    "id" SERIAL NOT NULL,
    "matterId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalMatterAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalMatterAuditLog_matterId_changedAt_idx" ON "LegalMatterAuditLog"("matterId", "changedAt");

-- CreateIndex
CREATE INDEX "LegalMatterAuditLog_changedById_idx" ON "LegalMatterAuditLog"("changedById");

-- AddForeignKey
ALTER TABLE "LegalMatterAuditLog" ADD CONSTRAINT "LegalMatterAuditLog_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatterAuditLog" ADD CONSTRAINT "LegalMatterAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
