-- CreateEnum
CREATE TYPE "SignupAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'BLOCKED');

-- CreateTable
CREATE TABLE "PublicSignupAttempt" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ip" TEXT,
    "deviceHash" TEXT,
    "userAgent" TEXT,
    "status" "SignupAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSignupAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupBlocklist" (
    "id" SERIAL NOT NULL,
    "ip" TEXT,
    "deviceHash" TEXT,
    "domain" TEXT,
    "reason" TEXT,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupBlocklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicSignupAttempt_email_createdAt_idx" ON "PublicSignupAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "PublicSignupAttempt_domain_createdAt_idx" ON "PublicSignupAttempt"("domain", "createdAt");

-- CreateIndex
CREATE INDEX "PublicSignupAttempt_ip_createdAt_idx" ON "PublicSignupAttempt"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "PublicSignupAttempt_deviceHash_createdAt_idx" ON "PublicSignupAttempt"("deviceHash", "createdAt");

-- CreateIndex
CREATE INDEX "SignupBlocklist_ip_idx" ON "SignupBlocklist"("ip");

-- CreateIndex
CREATE INDEX "SignupBlocklist_deviceHash_idx" ON "SignupBlocklist"("deviceHash");

-- CreateIndex
CREATE INDEX "SignupBlocklist_domain_idx" ON "SignupBlocklist"("domain");

-- CreateIndex
CREATE INDEX "SignupBlocklist_blockedUntil_idx" ON "SignupBlocklist"("blockedUntil");
