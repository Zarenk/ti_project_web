-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "InventoryHistory" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationId" INTEGER;

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "parentUnitId" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "organizationUnitId" INTEGER,
    "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSetting" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "OrganizationUnit_organizationId_idx" ON "OrganizationUnit"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationUnit_parentUnitId_idx" ON "OrganizationUnit"("parentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_organizationId_name_key" ON "OrganizationUnit"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_organizationId_code_key" ON "OrganizationUnit"("organizationId", "code");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationUnitId_idx" ON "OrganizationMembership"("organizationUnitId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_isDefault_idx" ON "OrganizationMembership"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_organizationUn_key" ON "OrganizationMembership"("userId", "organizationId", "organizationUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSetting_organizationId_key" ON "OrganizationSetting"("organizationId");

-- CreateIndex
CREATE INDEX "Client_organizationId_name_idx" ON "Client"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Entry_organizationId_date_idx" ON "Entry"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Inventory_organizationId_productId_idx" ON "Inventory"("organizationId", "productId");

-- CreateIndex
CREATE INDEX "InventoryHistory_organizationId_createdAt_idx" ON "InventoryHistory"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Sales_organizationId_createdAt_idx" ON "Sales"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Store_organizationId_name_idx" ON "Store"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Transfer_organizationId_createdAt_idx" ON "Transfer"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "User_organizationId_email_idx" ON "User"("organizationId", "email");

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSetting" ADD CONSTRAINT "OrganizationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
