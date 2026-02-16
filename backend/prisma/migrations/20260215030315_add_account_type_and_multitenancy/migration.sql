-- AlterEnum
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
CREATE TYPE "AccountType" AS ENUM ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO');

-- AlterTable: Add new columns to Account
ALTER TABLE "Account" ADD COLUMN "accountType" "AccountType",
                       ADD COLUMN "organizationId" INTEGER,
                       ADD COLUMN "companyId" INTEGER,
                       ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       ALTER COLUMN "level" SET DEFAULT 0;

-- DropIndex: Remove old unique constraint on code
DROP INDEX IF EXISTS "Account_code_key";

-- CreateIndex: Add new unique constraint on code + organizationId
CREATE UNIQUE INDEX "Account_code_organizationId_key" ON "Account"("code", "organizationId");

-- CreateIndex
CREATE INDEX "Account_organizationId_idx" ON "Account"("organizationId");

-- CreateIndex
CREATE INDEX "Account_companyId_idx" ON "Account"("companyId");

-- CreateIndex
CREATE INDEX "Account_accountType_idx" ON "Account"("accountType");

-- Drop old enum
DROP TYPE "AccountType_old";

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
