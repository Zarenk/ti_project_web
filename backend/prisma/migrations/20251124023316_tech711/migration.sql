-- CreateTable
CREATE TABLE "UserContextHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orgId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContextHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserContextHistory_userId_createdAt_idx" ON "UserContextHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserContextHistory" ADD CONSTRAINT "UserContextHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
