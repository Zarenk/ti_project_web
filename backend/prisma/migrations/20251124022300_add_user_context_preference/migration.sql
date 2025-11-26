-- CreateTable
CREATE TABLE "UserContextPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orgId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "totalSelections" INTEGER NOT NULL DEFAULT 1,
    "lastSelectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContextPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserContextPreference_userId_lastSelectedAt_idx" ON "UserContextPreference"("userId", "lastSelectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserContextPreference_userId_orgId_companyId_key" ON "UserContextPreference"("userId", "orgId", "companyId");

-- AddForeignKey
ALTER TABLE "UserContextPreference" ADD CONSTRAINT "UserContextPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
