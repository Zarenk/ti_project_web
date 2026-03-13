-- CreateEnum
CREATE TYPE "MembershipRequestType" AS ENUM ('SELF_REQUEST', 'ADMIN_ADD', 'ADMIN_MOVE');

-- CreateEnum
CREATE TYPE "MembershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: Add isActive + deactivation tracking to OrganizationMembership
ALTER TABLE "OrganizationMembership"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deactivatedAt" TIMESTAMP(3),
  ADD COLUMN "deactivatedBy" INTEGER;

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_isActive_idx"
  ON "OrganizationMembership"("userId", "isActive");

-- CreateTable
CREATE TABLE "MembershipRequest" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "targetUserId" INTEGER,
    "fromOrganizationId" INTEGER,
    "toOrganizationId" INTEGER NOT NULL,
    "requestedRole" "OrganizationMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "type" "MembershipRequestType" NOT NULL,
    "status" "MembershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "resolvedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipRequest_status_idx"
  ON "MembershipRequest"("status");

-- CreateIndex
CREATE INDEX "MembershipRequest_toOrganizationId_status_idx"
  ON "MembershipRequest"("toOrganizationId", "status");

-- CreateIndex
CREATE INDEX "MembershipRequest_requesterId_idx"
  ON "MembershipRequest"("requesterId");

-- CreateIndex
CREATE INDEX "MembershipRequest_targetUserId_idx"
  ON "MembershipRequest"("targetUserId");

-- AddForeignKey
ALTER TABLE "MembershipRequest"
  ADD CONSTRAINT "MembershipRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest"
  ADD CONSTRAINT "MembershipRequest_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest"
  ADD CONSTRAINT "MembershipRequest_fromOrganizationId_fkey"
  FOREIGN KEY ("fromOrganizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest"
  ADD CONSTRAINT "MembershipRequest_toOrganizationId_fkey"
  FOREIGN KEY ("toOrganizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest"
  ADD CONSTRAINT "MembershipRequest_resolvedBy_fkey"
  FOREIGN KEY ("resolvedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
