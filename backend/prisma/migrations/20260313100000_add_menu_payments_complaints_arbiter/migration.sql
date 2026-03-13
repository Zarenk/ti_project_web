-- ── MenuConfig ──────────────────────────────────────────────
CREATE TABLE "MenuConfig" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER,
    "organizationId" INTEGER,
    "tenantKey" TEXT NOT NULL DEFAULT 'org:0|company:0',

    CONSTRAINT "MenuConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MenuConfig_tenantKey_key" ON "MenuConfig"("tenantKey");
CREATE INDEX "MenuConfig_companyId_idx" ON "MenuConfig"("companyId");
CREATE INDEX "MenuConfig_organizationId_idx" ON "MenuConfig"("organizationId");

ALTER TABLE "MenuConfig"
  ADD CONSTRAINT "MenuConfig_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuConfig"
  ADD CONSTRAINT "MenuConfig_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PaymentOrder ────────────────────────────────────────────
CREATE TABLE "PaymentOrder" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" INTEGER,
    "salesId" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "paymentUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "providerResponse" JSONB,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "grossAmount" DECIMAL(12,2),
    "netAmount" DECIMAL(12,2),
    "commissionAmount" DECIMAL(12,2),
    "commissionRate" DECIMAL(5,4),
    "idempotencyKey" TEXT,
    "lastWebhookAt" TIMESTAMP(3),
    "webhookAttempts" INTEGER NOT NULL DEFAULT 0,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOrder_code_key" ON "PaymentOrder"("code");
CREATE UNIQUE INDEX "PaymentOrder_idempotencyKey_key" ON "PaymentOrder"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentOrder_provider_providerPaymentId_key" ON "PaymentOrder"("provider", "providerPaymentId");
CREATE INDEX "PaymentOrder_organizationId_status_idx" ON "PaymentOrder"("organizationId", "status");
CREATE INDEX "PaymentOrder_organizationId_createdAt_idx" ON "PaymentOrder"("organizationId", "createdAt");
CREATE INDEX "PaymentOrder_status_lastWebhookAt_idx" ON "PaymentOrder"("status", "lastWebhookAt");
CREATE INDEX "PaymentOrder_code_idx" ON "PaymentOrder"("code");

-- ── PaymentOrderEvent ───────────────────────────────────────
CREATE TABLE "PaymentOrderEvent" (
    "id" SERIAL NOT NULL,
    "paymentOrderId" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentOrderEvent_paymentOrderId_createdAt_idx" ON "PaymentOrderEvent"("paymentOrderId", "createdAt");

ALTER TABLE "PaymentOrderEvent"
  ADD CONSTRAINT "PaymentOrderEvent_paymentOrderId_fkey"
  FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── complaint_book (Libro de Reclamaciones) ─────────────────
CREATE TABLE "complaint_book" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "correlativeNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "consumerName" TEXT NOT NULL,
    "consumerDocType" TEXT NOT NULL,
    "consumerDocNumber" TEXT NOT NULL,
    "consumerAddress" TEXT,
    "consumerPhone" TEXT,
    "consumerEmail" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "parentName" TEXT,
    "parentDocType" TEXT,
    "parentDocNumber" TEXT,
    "goodType" TEXT NOT NULL,
    "claimedAmount" DOUBLE PRECISION,
    "amountCurrency" TEXT NOT NULL DEFAULT 'PEN',
    "goodDescription" TEXT NOT NULL,
    "complaintType" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "consumerRequest" TEXT NOT NULL,
    "reclassified" BOOLEAN NOT NULL DEFAULT false,
    "reclassifiedAt" TIMESTAMP(3),
    "reclassifiedBy" INTEGER,
    "signatureConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "signatureTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseText" TEXT,
    "responseDate" TIMESTAMP(3),
    "respondedByUserId" INTEGER,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "businessDaysUsed" INTEGER,
    "emailSentToConsumer" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "responseEmailSentAt" TIMESTAMP(3),
    "providerLegalName" TEXT NOT NULL,
    "providerRuc" TEXT NOT NULL,
    "providerAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaint_book_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "complaint_book_trackingCode_key" ON "complaint_book"("trackingCode");
CREATE UNIQUE INDEX "complaint_book_companyId_correlativeNumber_year_key" ON "complaint_book"("companyId", "correlativeNumber", "year");
CREATE INDEX "complaint_book_organizationId_companyId_idx" ON "complaint_book"("organizationId", "companyId");
CREATE INDEX "complaint_book_trackingCode_idx" ON "complaint_book"("trackingCode");
CREATE INDEX "complaint_book_status_idx" ON "complaint_book"("status");
CREATE INDEX "complaint_book_deadlineDate_idx" ON "complaint_book"("deadlineDate");
CREATE INDEX "complaint_book_companyId_year_idx" ON "complaint_book"("companyId", "year");

ALTER TABLE "complaint_book"
  ADD CONSTRAINT "complaint_book_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "complaint_book"
  ADD CONSTRAINT "complaint_book_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "complaint_book"
  ADD CONSTRAINT "complaint_book_respondedByUserId_fkey"
  FOREIGN KEY ("respondedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── HelpKBCandidate: arbiter scoring fields ─────────────────
ALTER TABLE "HelpKBCandidate"
  ADD COLUMN "qualityScore" DOUBLE PRECISION,
  ADD COLUMN "arbiterDecision" TEXT,
  ADD COLUMN "scoredAt" TIMESTAMP(3),
  ADD COLUMN "scoreFactors" JSONB;
